"use client";

import { BookOpenCheck, FileCode2 } from "lucide-react";
import { Markdown } from "@/components/Markdown";
import { Button, Card, Eyebrow } from "@/components/ui";
import type { ProjectUpdater } from "@/lib/hooks";
import { recordLesson, recordQuiz, type Project } from "@/lib/project";
import type { Lesson } from "@/lib/schemas";
import { ChallengeCard } from "./ChallengeCard";
import { QuizCard } from "./QuizCard";

const CONTEXT_LINES = 5;

function CodeExcerpt({ code, line }: { code: string; line: number }) {
  const lines = code.split("\n");
  const target = Math.min(Math.max(line, 1), lines.length);
  const start = Math.max(1, target - CONTEXT_LINES);
  const end = Math.min(lines.length, target + CONTEXT_LINES);
  return (
    <pre className="overflow-x-auto rounded-xl border border-line bg-[#0d0d0d] py-2 font-mono text-[12px] leading-5">
      {lines.slice(start - 1, end).map((text, i) => {
        const n = start + i;
        return (
          <div key={n} className={n === target ? "bg-accent-soft" : undefined}>
            <span className="inline-block w-10 select-none pr-3 text-right text-faint">{n}</span>
            <span className={n === target ? "text-fg" : "text-muted"}>{text || " "}</span>
          </div>
        );
      })}
    </pre>
  );
}

export function LessonView({ lesson, project, update }: { lesson: Lesson; project: Project; update: ProjectUpdater }) {
  const read = project.progress.lessonsRead.includes(lesson.id);
  const fileCode = project.files[lesson.fileRef.path];

  return (
    <div className="min-w-0 space-y-4">
      <Card className="p-6">
        <Eyebrow>{lesson.difficulty} · {lesson.concept}</Eyebrow>
        <div className="mt-3 rounded-xl border border-accent/30 bg-accent-soft p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-accent">Why it matters in your app</p>
          <p className="mt-1 text-sm">{lesson.whyInYourApp}</p>
        </div>

        {fileCode !== undefined && (
          <div className="mt-4">
            <p className="mb-2 flex items-center gap-1.5 text-xs text-muted">
              <FileCode2 className="size-3.5" /> In your code: <span className="font-mono text-fg">{lesson.fileRef.path}:{lesson.fileRef.line}</span>
            </p>
            <CodeExcerpt code={fileCode} line={lesson.fileRef.line} />
          </div>
        )}

        <Markdown className="mt-5">{lesson.lesson}</Markdown>

        <div className="mt-5 flex justify-end">
          {read ? (
            <span className="flex items-center gap-1.5 text-sm text-ok"><BookOpenCheck className="size-4" /> Lesson complete</span>
          ) : (
            <Button onClick={() => update((p) => ({ ...p, progress: recordLesson(p.progress, lesson.id) }))} icon={<BookOpenCheck className="size-4" />}>
              Mark as read · +20 XP
            </Button>
          )}
        </div>
      </Card>

      <Card className="p-6">
        <p className="font-semibold">Check your understanding</p>
        <div className="mt-4 space-y-4">
          {lesson.quiz.map((q, i) => {
            const key = `${lesson.id}:${i}`;
            return (
              <QuizCard
                key={key}
                question={q}
                attempted={project.progress.quizAttempted.includes(key)}
                onAnswer={(correct) => update((p) => ({ ...p, progress: recordQuiz(p.progress, key, correct) }))}
              />
            );
          })}
        </div>
      </Card>

      <ChallengeCard lesson={lesson} project={project} update={update} />
    </div>
  );
}
