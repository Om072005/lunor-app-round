"use client";

import { useCallback, useRef, useState } from "react";
import { ApiClientError, postStream, streamErrorMessage } from "@/lib/api-client";
import { finalizeStream, parseFileStream, splitTrailingError, type ParsedFileStream } from "@/lib/file-stream-parser";
import { useAsyncAction, type ProjectUpdater } from "@/lib/hooks";
import { applyFiles, type BuildLogEntry } from "@/lib/project";
import { checkProject } from "@/lib/project-files";

export interface CodeStreamRequest {
  endpoint: "/api/build" | "/api/modify";
  body: unknown;
  kind: BuildLogEntry["kind"];
  title: string;
  milestoneId?: string;
}

/** Imports pointing at files that were never written mean the model stopped before finishing the step. */
function hasStructuralGaps(files: Record<string, string>): boolean {
  return checkProject(files).some((i) => i.kind === "missing-entry" || i.kind === "missing-file");
}

/**
 * Runs a streamed code generation (build milestone, change request or fix), shows
 * files as they arrive, then merges completed files into the project. A milestone
 * only counts as built when the generation finished and left no dangling imports;
 * otherwise completed files are kept and the user can Retry to continue.
 */
export function useCodeStream(update: ProjectUpdater, getFiles: () => Record<string, string>) {
  const [live, setLive] = useState<ParsedFileStream | null>(null);
  const runId = useRef(0);

  const action = useAsyncAction(
    useCallback(
      async (signal: AbortSignal, req: CodeStreamRequest) => {
        const id = ++runId.current;
        const isCurrent = () => runId.current === id;
        setLive({ notes: "", files: [], partial: null });
        try {
          const text = await postStream(req.endpoint, req.body, (t) => isCurrent() && setLive(parseFileStream(splitTrailingError(t).body)), signal);
          const { parsed, error } = finalizeStream(text);
          if (parsed.files.length === 0) {
            throw new ApiClientError(error ?? "BAD_OUTPUT", error ? streamErrorMessage(error) : "The AI didn't return any files. Please retry.");
          }

          const merged = applyFiles(getFiles(), parsed.files).files;
          const complete = error === null && !hasStructuralGaps(merged);

          update((p) => {
            const { files, changed } = applyFiles(p.files, parsed.files);
            const entry: BuildLogEntry = {
              id: `${req.kind}-${Date.now()}`,
              kind: req.kind,
              title: complete ? req.title : `${req.title} (incomplete)`,
              notes: parsed.notes,
              changedFiles: changed,
              at: Date.now(),
            };
            const markBuilt = complete && req.milestoneId && !p.builtMilestones.includes(req.milestoneId);
            const builtMilestones = markBuilt ? [...p.builtMilestones, req.milestoneId!] : p.builtMilestones;
            return { ...p, files, builtMilestones, buildLog: [...p.buildLog, entry] };
          });

          if (!complete) throw new ApiClientError(error ?? "INCOMPLETE", streamErrorMessage(error ?? "INCOMPLETE"));
        } finally {
          if (isCurrent()) setLive(null);
        }
      },
      [update, getFiles],
    ),
  );

  return { ...action, live };
}
