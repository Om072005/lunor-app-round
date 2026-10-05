"use client";

import clsx from "clsx";
import { ArrowRight, Check, Download, Hammer, Loader2, Square } from "lucide-react";
import { useMemo, useState } from "react";
import { CodeEditor } from "@/components/CodeEditor";
import { FileTree } from "@/components/FileTree";
import { PhonePreview } from "@/components/PhonePreview";
import { Button } from "@/components/ui";
import { downloadProjectZip } from "@/lib/download";
import { nextMilestone } from "@/lib/project";
import { checkProject } from "@/lib/project-files";
import { useProjects } from "@/lib/store";
import type { StageProps } from "../types";
import { ActivityPanel } from "./ActivityPanel";
import { useCodeStream, type CodeStreamRequest } from "./useCodeStream";
import { useSnackPreview } from "./useSnackPreview";

export function BuildStage({ project, update, goTo }: StageProps) {
  const { brief, plan, files } = project;
  const code = useCodeStream(update);
  const preview = useSnackPreview(project, update);
  const [selected, setSelected] = useState<string | undefined>(() => (files["App.js"] !== undefined ? "App.js" : Object.keys(files)[0]));
  const [lastRequest, setLastRequest] = useState<CodeStreamRequest | null>(null);

  const issues = useMemo(() => (Object.keys(files).length > 0 ? checkProject(files) : []), [files]);
  const upcoming = nextMilestone(project);
  const lastChanged = project.buildLog.at(-1)?.changedFiles ?? [];
  const streamingPath = code.live?.partial?.path;
  const busy = code.loading;

  if (!brief || !plan) return null;

  const runStream = async (req: CodeStreamRequest) => {
    setLastRequest(req);
    const ok = await code.run(req);
    if (!ok) return;
    const latest = useProjects.getState().projects[project.id];
    if (latest && checkProject(latest.files).length === 0) await preview.run(latest.files);
  };

  const buildNext = () => {
    if (!upcoming) return;
    runStream({
      endpoint: "/api/build",
      body: { brief, plan, milestoneId: upcoming.id, files },
      kind: "milestone",
      title: `Milestone ${plan.milestones.indexOf(upcoming) + 1}: ${upcoming.title}`,
      milestoneId: upcoming.id,
    });
  };
  const requestChange = (instruction: string) =>
    runStream({ endpoint: "/api/modify", body: { brief, files, mode: "change", instruction }, kind: "change", title: instruction });
  const fixIssues = () =>
    runStream({ endpoint: "/api/modify", body: { brief, files, mode: "fix", issues: issues.map((i) => `${i.path}: ${i.message}`) }, kind: "fix", title: "Fixed checker issues" });

  // While streaming, the editor follows the file being written.
  const livePath = streamingPath ?? selected;
  const liveFile = code.live?.files.find((f) => f.path === livePath);
  const editorValue = streamingPath && livePath === streamingPath ? code.live!.partial!.content : liveFile?.content ?? (livePath ? files[livePath] ?? "" : "");

  return (
    <div className="flex h-[calc(100vh-56px)] flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-2.5">
        <ol className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto">
          {plan.milestones.map((m, i) => {
            const built = project.builtMilestones.includes(m.id);
            const active = busy && lastRequest?.milestoneId === m.id;
            return (
              <li key={m.id} className={clsx("flex shrink-0 items-center gap-2 rounded-full border px-3 py-1 text-xs", built ? "border-ok/40 text-ok" : active ? "border-accent text-fg" : "border-line-strong text-faint")}>
                {built ? <Check className="size-3" /> : active ? <Loader2 className="size-3 animate-spin text-accent" /> : <span className="font-bold">{i + 1}</span>}
                {m.title}
              </li>
            );
          })}
        </ol>
        <div className="flex items-center gap-2">
          {busy ? (
            <Button variant="secondary" size="sm" onClick={code.cancel} icon={<Square className="size-3" />}>Stop</Button>
          ) : upcoming ? (
            <Button size="sm" onClick={buildNext} icon={<Hammer className="size-3.5" />}>
              Build milestone {plan.milestones.indexOf(upcoming) + 1}
            </Button>
          ) : (
            <Button size="sm" onClick={() => goTo("explain")} icon={<ArrowRight className="size-3.5" />}>Explain my code</Button>
          )}
          {Object.keys(files).length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => downloadProjectZip(brief.name, files)} icon={<Download className="size-3.5" />}>
              Export
            </Button>
          )}
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[200px_minmax(0,1fr)_340px] xl:grid-cols-[210px_minmax(0,1fr)_340px_320px]">
        <aside className="hidden overflow-y-auto border-r border-line lg:block">
          <p className="px-3 pt-3 text-[11px] font-semibold uppercase tracking-wider text-faint">Files</p>
          <FileTree paths={Object.keys(files)} selected={livePath} onSelect={setSelected} changed={lastChanged} streaming={streamingPath} />
        </aside>

        <section className="flex min-h-[320px] min-w-0 flex-col border-r border-line">
          <div className="flex items-center gap-2 border-b border-line px-3 py-2 font-mono text-xs text-muted">
            {livePath ?? "—"}
            {streamingPath && <span className="text-accent">· writing…</span>}
            {!busy && livePath && <span className="ml-auto font-sans text-faint">editable — your edits update the preview</span>}
          </div>
          <div className="min-h-0 flex-1">
            {livePath ? (
              <CodeEditor
                path={livePath}
                value={editorValue}
                readOnly={busy}
                followTail={Boolean(streamingPath)}
                onChange={(v) => !busy && update((p) => ({ ...p, files: { ...p.files, [livePath]: v } }))}
              />
            ) : (
              <EmptyEditor busy={busy} milestone={upcoming?.title} onBuild={buildNext} />
            )}
          </div>
        </section>

        <section className="flex justify-center overflow-y-auto border-r border-line p-4">
          <PhonePreview snack={preview.snack} stale={preview.stale} loading={preview.loading} error={preview.error} onRefresh={() => preview.run(files)} hasFiles={Object.keys(files).length > 0} />
        </section>

        <aside className="min-h-[360px] border-t border-line lg:col-span-3 xl:col-span-1 xl:border-t-0">
          <ActivityPanel
            log={project.buildLog}
            issues={issues}
            liveNotes={code.live ? code.live.notes : null}
            busy={busy}
            error={code.error}
            onRetry={lastRequest ? () => runStream(lastRequest) : undefined}
            onChange={requestChange}
            onFix={fixIssues}
            canChange={project.builtMilestones.length > 0}
          />
        </aside>
      </div>
    </div>
  );
}

function EmptyEditor({ busy, milestone, onBuild }: { busy: boolean; milestone?: string; onBuild: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
      <Hammer className="size-10 text-faint" />
      <div>
        <p className="font-semibold">{busy ? "Starting the build…" : "Ready to build"}</p>
        <p className="mt-1 max-w-sm text-sm text-muted">
          Lunor builds your app milestone by milestone, so you can see — and understand — how it grows. Each milestone leaves a working app.
        </p>
      </div>
      {!busy && milestone && <Button onClick={onBuild} icon={<Hammer className="size-4" />}>Build “{milestone}”</Button>}
    </div>
  );
}
