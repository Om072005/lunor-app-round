"use client";

import { ArrowRight, Brain, FileText } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import { Badge, Button, Card, ErrorNote, SectionTitle, Thinking } from "@/components/ui";
import { postJson } from "@/lib/api-client";
import { useAsyncAction } from "@/lib/hooks";
import type { Brief, Understanding } from "@/lib/schemas";
import type { StageProps } from "../types";
import { BriefView } from "./BriefView";
import { QuestionCard } from "./QuestionCard";

const COMPLEXITY_TONE = { starter: "ok", intermediate: "warn", advanced: "accent" } as const;

export function UnderstandStage({ project, update, goTo }: StageProps) {
  const { understanding, answers, brief, idea } = project;

  const understand = useAsyncAction(
    useCallback(
      async (signal: AbortSignal) => {
        const result = await postJson<Understanding>("/api/understand", { idea }, signal);
        update((p) => ({ ...p, understanding: result, answers: {} }));
      },
      [idea, update],
    ),
  );

  const makeBrief = useAsyncAction(
    useCallback(
      async (signal: AbortSignal) => {
        if (!understanding) return;
        const result = await postJson<Brief>("/api/brief", { idea, questions: understanding.questions, answers }, signal);
        update((p) => ({ ...p, brief: result, plan: undefined, planApproved: false }));
      },
      [idea, understanding, answers, update],
    ),
  );

  const started = useRef(false);
  useEffect(() => {
    if (!understanding && !started.current) {
      started.current = true;
      understand.run();
    }
  }, [understanding, understand]);

  const setAnswer = (qid: string, values: string[]) => update((p) => ({ ...p, answers: { ...p.answers, [qid]: values } }));
  const answeredCount = understanding?.questions.filter((q) => (answers[q.id] ?? []).length > 0).length ?? 0;

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      <SectionTitle
        eyebrow="Stage 1 · Understand"
        title="Let's make sure we're building the right thing"
        subtitle="Good apps start with good questions. Lunor reads your idea like a product engineer and asks what would change the build."
      />

      <Card className="p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-faint">Your idea</p>
        <p className="mt-2 text-lg">&ldquo;{idea}&rdquo;</p>
      </Card>

      {understand.loading && (
        <Thinking label="Reading your idea…" steps={["Identifying the core user and problem", "Spotting decisions that change the build", "Writing clarifying questions"]} />
      )}
      {understand.error && <ErrorNote message={understand.error} onRetry={() => understand.run()} />}

      {understanding && !understand.loading && (
        <>
          <Card className="p-5">
            <div className="flex items-center gap-2">
              <Brain className="size-4 text-accent" />
              <p className="font-semibold">Lunor&apos;s read</p>
              <Badge tone={COMPLEXITY_TONE[understanding.complexity]}>{understanding.complexity}</Badge>
              <Badge>{understanding.appType}</Badge>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted">{understanding.summary}</p>
            {understanding.similarApps.length > 0 && (
              <p className="mt-3 text-xs text-faint">Similar to: {understanding.similarApps.join(" · ")}</p>
            )}
          </Card>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">A few questions ({answeredCount}/{understanding.questions.length} answered)</h3>
              <button onClick={() => understand.run()} className="text-xs text-muted hover:text-fg">Ask different questions</button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {understanding.questions.map((q, i) => (
                <QuestionCard key={q.id} index={i} question={q} selected={answers[q.id] ?? []} onChange={(v) => setAnswer(q.id, v)} />
              ))}
            </div>
          </div>

          {!brief && (
            <div className="flex flex-wrap items-center justify-end gap-3">
              <span className="text-xs text-faint">Unanswered questions get a sensible default.</span>
              <Button onClick={() => makeBrief.run()} loading={makeBrief.loading} icon={<FileText className="size-4" />}>
                Write the app brief
              </Button>
            </div>
          )}
          {makeBrief.loading && <Thinking label="Writing your app brief…" steps={["Defining personas", "Prioritising features (MoSCoW)", "Scoping the MVP"]} />}
          {makeBrief.error && <ErrorNote message={makeBrief.error} onRetry={() => makeBrief.run()} />}
        </>
      )}

      {brief && !makeBrief.loading && (
        <>
          <BriefView brief={brief} onChange={(b) => update((p) => ({ ...p, brief: b }))} onRegenerate={() => makeBrief.run()} />
          <div className="flex justify-end">
            <Button onClick={() => goTo("plan")} icon={<ArrowRight className="size-4" />}>
              Brief looks good — plan it
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
