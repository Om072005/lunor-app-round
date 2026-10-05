"use client";

import clsx from "clsx";
import { AlertTriangle, MessageCircleQuestion, Send } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { LineHighlight } from "@/components/CodeEditor";
import { Markdown } from "@/components/Markdown";
import { Badge, Button, ErrorNote, Thinking } from "@/components/ui";
import type { Level } from "@/lib/ai/prompts";
import { postJson, postStream } from "@/lib/api-client";
import { useAsyncAction, type ProjectUpdater } from "@/lib/hooks";
import { contentHash, type Project } from "@/lib/project";
import type { FileExplanation } from "@/lib/schemas";

export function ExplanationPanel({
  project,
  update,
  path,
  level,
  selection,
  activeRange,
  onHighlight,
}: {
  project: Project;
  update: ProjectUpdater;
  path: string;
  level: Level;
  selection: string;
  activeRange: LineHighlight | null;
  onHighlight: (range: LineHighlight | null) => void;
}) {
  const code = project.files[path] ?? "";
  const hash = contentHash(code);
  const cacheKey = `${level}:${path}`;
  const cached = project.explanations[cacheKey];
  const explanation = cached && cached.hash === hash ? cached.data : undefined;

  const explain = useAsyncAction(
    useCallback(
      async (signal: AbortSignal) => {
        const data = await postJson<FileExplanation>("/api/explain", { path, code, brief: project.brief, level }, signal);
        update((p) => ({ ...p, explanations: { ...p.explanations, [cacheKey]: { level, hash, data } } }));
      },
      [path, code, project.brief, level, cacheKey, hash, update],
    ),
  );

  const started = useRef(false);
  useEffect(() => {
    if (!explanation && !started.current) {
      started.current = true;
      explain.run();
    }
  }, [explanation, explain]);

  return (
    <div className="space-y-4 p-4">
      {explain.loading && <Thinking label={`Reading ${path}…`} />}
      {explain.error && <ErrorNote message={explain.error} onRetry={() => explain.run()} />}

      {explanation && (
        <>
          <div>
            <p className="text-sm leading-relaxed">{explanation.summary}</p>
            <p className="mt-2 text-xs text-muted"><span className="font-semibold text-fg">Role:</span> {explanation.role}</p>
          </div>
          <ol className="space-y-2">
            {explanation.sections.map((s, i) => {
              const active = activeRange?.startLine === s.startLine && activeRange?.endLine === s.endLine;
              return (
                <li key={`${s.startLine}-${i}`}>
                  <button
                    onClick={() => onHighlight(active ? null : { startLine: s.startLine, endLine: s.endLine })}
                    className={clsx("w-full rounded-xl border p-3 text-left transition-colors", active ? "border-accent bg-accent-soft" : "border-line bg-surface-2 hover:border-line-strong")}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-faint">L{s.startLine}–{s.endLine}</span>
                      <span className="text-sm font-semibold">{s.title}</span>
                    </div>
                    <p className="mt-1 text-[13px] leading-relaxed text-muted">{s.explanation}</p>
                    <Badge tone="accent" className="mt-2">{s.concept}</Badge>
                  </button>
                </li>
              );
            })}
          </ol>
          {explanation.gotchas.length > 0 && (
            <div className="rounded-xl border border-warn/30 bg-warn-soft p-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-warn"><AlertTriangle className="size-3.5" /> Common mistakes</p>
              <ul className="mt-1 space-y-1 text-xs text-muted">{explanation.gotchas.map((g) => <li key={g}>• {g}</li>)}</ul>
            </div>
          )}
        </>
      )}

      <AskBox path={path} code={code} selection={selection} level={level} />
    </div>
  );
}

function AskBox({ path, code, selection, level }: { path: string; code: string; selection: string; level: Level }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");

  const ask = useAsyncAction(
    useCallback(
      async (signal: AbortSignal, q: string) => {
        setAnswer("");
        await postStream("/api/ask", { path, code, selection, question: q, level }, setAnswer, signal);
      },
      [path, code, selection, level],
    ),
  );

  const submit = () => !ask.loading && ask.run(question.trim());

  return (
    <div className="rounded-xl border border-line bg-surface p-3">
      <p className="flex items-center gap-1.5 text-sm font-semibold"><MessageCircleQuestion className="size-4 text-accent" /> Ask about this code</p>
      <p className="mt-1 text-xs text-faint">
        {selection.trim() ? `Asking about your selection (${selection.split("\n").length} lines)` : "Tip: select lines in the editor to ask about them."}
      </p>
      <div className="mt-2 flex gap-2">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="e.g. Why use useEffect here?"
          aria-label="Question about the code"
          className="flex-1 rounded-lg border border-line-strong bg-bg px-3 py-1.5 text-sm outline-none focus:border-accent"
        />
        <Button size="sm" onClick={submit} loading={ask.loading} aria-label="Ask" icon={<Send className="size-3.5" />} />
      </div>
      {ask.error && <div className="mt-2"><ErrorNote message={ask.error} /></div>}
      {answer && <Markdown className="mt-3 text-[13px]">{answer}</Markdown>}
    </div>
  );
}
