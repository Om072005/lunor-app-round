"use client";

import { useCallback, useState } from "react";
import { ApiClientError, postStream } from "@/lib/api-client";
import { parseFileStream, type ParsedFileStream } from "@/lib/file-stream-parser";
import { useAsyncAction, type ProjectUpdater } from "@/lib/hooks";
import { applyFiles, type BuildLogEntry } from "@/lib/project";

export interface CodeStreamRequest {
  endpoint: "/api/build" | "/api/modify";
  body: unknown;
  kind: BuildLogEntry["kind"];
  title: string;
  milestoneId?: string;
}

/**
 * Runs a streamed code generation (build milestone, change request or fix), shows
 * files as they arrive, then merges them into the project in a single update.
 */
export function useCodeStream(update: ProjectUpdater) {
  const [live, setLive] = useState<ParsedFileStream | null>(null);

  const action = useAsyncAction(
    useCallback(
      async (signal: AbortSignal, req: CodeStreamRequest) => {
        setLive({ notes: "", files: [], partial: null });
        try {
          const text = await postStream(req.endpoint, req.body, (t) => setLive(parseFileStream(t)), signal);
          const parsed = parseFileStream(text);
          if (parsed.files.length === 0) throw new ApiClientError("BAD_OUTPUT", "The AI didn't return any files. Please retry.");

          update((p) => {
            const { files, changed } = applyFiles(p.files, parsed.files);
            const entry: BuildLogEntry = {
              id: `${req.kind}-${Date.now()}`,
              kind: req.kind,
              title: req.title,
              notes: parsed.notes,
              changedFiles: changed,
              at: Date.now(),
            };
            const builtMilestones =
              req.milestoneId && !p.builtMilestones.includes(req.milestoneId) ? [...p.builtMilestones, req.milestoneId] : p.builtMilestones;
            return { ...p, files, builtMilestones, buildLog: [...p.buildLog, entry] };
          });
        } finally {
          setLive(null);
        }
      },
      [update],
    ),
  );

  return { ...action, live };
}
