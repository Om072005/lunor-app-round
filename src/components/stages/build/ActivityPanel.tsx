"use client";

import { AlertTriangle, CheckCircle2, Hammer, Send, Wand2, Wrench } from "lucide-react";
import { useState } from "react";
import { Markdown } from "@/components/Markdown";
import { Button, ErrorNote } from "@/components/ui";
import { LIMITS } from "@/lib/constants";
import type { BuildLogEntry } from "@/lib/project";
import type { ProjectIssue } from "@/lib/project-files";

const SUGGESTIONS = ["Add a dark mode toggle", "Add a confirmation before deleting", "Show an empty state with an illustration icon", "Make the accent colour purple"];
const KIND_ICON = { milestone: Hammer, change: Wand2, fix: Wrench };

export function ActivityPanel({
  log,
  issues,
  liveNotes,
  busy,
  error,
  onRetry,
  onChange,
  onFix,
  canChange,
}: {
  log: BuildLogEntry[];
  issues: ProjectIssue[];
  liveNotes: string | null;
  busy: boolean;
  error: string | null;
  onRetry?: () => void;
  onChange: (instruction: string) => void;
  onFix: () => void;
  canChange: boolean;
}) {
  const [instruction, setInstruction] = useState("");
  const submit = () => {
    const text = instruction.trim();
    if (!text || busy) return;
    onChange(text);
    setInstruction("");
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {log.length === 0 && liveNotes === null && (
          <p className="p-2 text-sm text-muted">Build notes appear here — what Lunor built, why, and what to try in the preview.</p>
        )}
        {[...log].reverse().map((entry) => {
          const Icon = KIND_ICON[entry.kind];
          return (
            <article key={entry.id} className="rounded-xl border border-line bg-surface-2 p-3">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <Icon className="size-3.5 text-accent" /> {entry.title}
              </p>
              {entry.notes && <Markdown className="mt-1 text-[13px] text-muted">{entry.notes}</Markdown>}
              {entry.changedFiles.length > 0 && (
                <p className="mt-2 truncate font-mono text-[11px] text-faint" title={entry.changedFiles.join(", ")}>
                  {entry.changedFiles.length} file{entry.changedFiles.length > 1 ? "s" : ""}: {entry.changedFiles.join(", ")}
                </p>
              )}
            </article>
          );
        })}
        {liveNotes !== null && (
          <article className="rounded-xl border border-accent/40 bg-accent-soft p-3">
            <p className="text-sm font-semibold">Writing code…</p>
            {liveNotes && <Markdown className="mt-1 text-[13px]">{liveNotes}</Markdown>}
          </article>
        )}
      </div>

      <div className="space-y-2 border-t border-line p-3">
        {error && <ErrorNote message={error} onRetry={onRetry} />}
        {issues.length > 0 && !busy ? (
          <div className="rounded-xl border border-warn/30 bg-warn-soft p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-warn">
              <AlertTriangle className="size-3.5" /> Project checker found {issues.length} issue{issues.length > 1 ? "s" : ""}
            </p>
            <ul className="mt-1 max-h-20 space-y-0.5 overflow-y-auto text-xs text-muted">
              {issues.map((i) => <li key={i.path + i.message}><span className="font-mono">{i.path}</span>: {i.message}</li>)}
            </ul>
            <Button size="sm" className="mt-2" onClick={onFix} icon={<Wrench className="size-3.5" />}>Fix with AI</Button>
          </div>
        ) : (
          log.length > 0 && !busy && <p className="flex items-center gap-1.5 text-xs text-ok"><CheckCircle2 className="size-3.5" /> Project checker: imports and entry point look good</p>
        )}

        {canChange && (
          <>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => setInstruction(s)} className="rounded-full border border-line-strong px-2 py-0.5 text-[11px] text-muted hover:text-fg">
                  {s}
                </button>
              ))}
            </div>
            <div className="flex items-end gap-2">
              <textarea
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submit();
                  }
                }}
                maxLength={LIMITS.instructionMaxChars}
                rows={2}
                placeholder="Ask for a change… (Enter to send)"
                aria-label="Ask for a change"
                className="flex-1 resize-none rounded-xl border border-line-strong bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
              />
              <Button onClick={submit} disabled={!instruction.trim() || busy} aria-label="Send change request" icon={<Send className="size-4" />} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
