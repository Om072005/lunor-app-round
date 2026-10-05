"use client";

import clsx from "clsx";
import { Award, BookOpen, CheckCircle2, ExternalLink, FlaskConical, HelpCircle, RefreshCw, Trophy } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Markdown } from "@/components/Markdown";
import { Badge, Button, Card, ErrorNote, SectionTitle, Thinking } from "@/components/ui";
import { postJson } from "@/lib/api-client";
import { useAsyncAction } from "@/lib/hooks";
import { roadmapLevel } from "@/lib/roadmap";
import type { LearningPath } from "@/lib/schemas";
import type { StageProps } from "../types";
import { LessonView } from "./LessonView";

const LUNOR_ROADMAP_URL = "https://lunor.online/domain/app-development";

export function LearnStage({ project, update }: StageProps) {
  const { learning, progress } = project;
  const [activeId, setActiveId] = useState<string | undefined>(learning?.lessons[0]?.id);

  const generate = useAsyncAction(
    useCallback(
      async (signal: AbortSignal) => {
        const result = await postJson<LearningPath>("/api/learn", { brief: project.brief, plan: project.plan, files: project.files }, signal);
        update((p) => ({ ...p, learning: result }));
        setActiveId(result.lessons[0]?.id);
      },
      [project.brief, project.plan, project.files, update],
    ),
  );

  const started = useRef(false);
  useEffect(() => {
    if (!learning && !started.current) {
      started.current = true;
      generate.run();
    }
  }, [learning, generate]);

  const active = learning?.lessons.find((l) => l.id === activeId) ?? learning?.lessons[0];
  const totalXp = learning ? learning.lessons.reduce((n, l) => n + 20 + l.quiz.length * 15 + 50, 0) : 0;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <SectionTitle
        eyebrow="Stage 5 · Learn"
        title="Learn from the app you just built"
        subtitle="Every lesson is built from concepts actually used in your code, then mapped onto Lunor's App Development roadmap."
        actions={
          learning && (
            <Button variant="ghost" size="sm" onClick={() => generate.run()} loading={generate.loading} icon={<RefreshCw className="size-3.5" />}>
              Regenerate
            </Button>
          )
        }
      />

      {generate.loading && <Thinking label="Designing your learning path…" steps={["Finding the concepts your app uses", "Mapping them to Lunor's roadmap", "Writing lessons, quizzes and challenges"]} />}
      {generate.error && <ErrorNote message={generate.error} onRetry={() => generate.run()} />}

      {learning && !generate.loading && (
        <>
          <Card className="flex flex-wrap items-center gap-6 p-5">
            <div className="flex items-center gap-3">
              <span className="grid size-12 place-items-center rounded-xl bg-accent-soft"><Trophy className="size-6 text-accent" /></span>
              <div>
                <p className="text-2xl font-bold">{progress.xp} <span className="text-sm font-medium text-muted">/ {totalXp} XP</span></p>
                <p className="text-xs text-muted">Read +20 · Quiz first-try +15 · Challenge +50</p>
              </div>
            </div>
            <div className="h-2 min-w-[160px] flex-1 overflow-hidden rounded-full bg-surface-3">
              <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${Math.min(100, (progress.xp / Math.max(totalXp, 1)) * 100)}%` }} />
            </div>
            <div className="flex gap-4 text-xs text-muted">
              <span className="flex items-center gap-1"><BookOpen className="size-3.5" /> {progress.lessonsRead.length}/{learning.lessons.length}</span>
              <span className="flex items-center gap-1"><HelpCircle className="size-3.5" /> {progress.quizCorrect.length} correct</span>
              <span className="flex items-center gap-1"><FlaskConical className="size-3.5" /> {progress.challengesPassed.length} challenges</span>
            </div>
          </Card>

          <p className="text-sm text-muted">{learning.overview}</p>

          <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
            <aside className="space-y-2">
              {learning.lessons.map((l, i) => {
                const lv = roadmapLevel(l.roadmapLevel);
                const read = progress.lessonsRead.includes(l.id);
                const passed = progress.challengesPassed.includes(l.id);
                return (
                  <button
                    key={l.id}
                    onClick={() => setActiveId(l.id)}
                    className={clsx("w-full rounded-xl border p-3 text-left transition-colors", active?.id === l.id ? "border-accent bg-accent-soft" : "border-line bg-surface hover:border-line-strong")}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-faint">{i + 1}</span>
                      <span className="flex-1 text-sm font-semibold">{l.concept}</span>
                      {passed ? <Award className="size-4 text-warn" /> : read && <CheckCircle2 className="size-4 text-ok" />}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {lv && <Badge tone="accent">LV {lv.level} · {lv.title}</Badge>}
                      <Badge>{l.difficulty}</Badge>
                    </div>
                  </button>
                );
              })}
              <Card className="p-4">
                <p className="text-sm font-semibold">Next steps</p>
                <ul className="mt-2 space-y-1 text-xs text-muted">{learning.nextSteps.map((s) => <li key={s}>• {s}</li>)}</ul>
                <a href={LUNOR_ROADMAP_URL} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline">
                  Continue on Lunor&apos;s App Dev roadmap <ExternalLink className="size-3" />
                </a>
              </Card>
            </aside>

            {active && <LessonView key={active.id} lesson={active} project={project} update={update} />}
          </div>
        </>
      )}
      {learning && !generate.loading && active === undefined && <Markdown>No lessons yet.</Markdown>}
    </div>
  );
}
