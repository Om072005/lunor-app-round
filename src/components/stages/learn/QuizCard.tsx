"use client";

import clsx from "clsx";
import { CheckCircle2, XCircle } from "lucide-react";
import { useState } from "react";
import type { Lesson } from "@/lib/schemas";

export function QuizCard({ question, attempted, onAnswer }: { question: Lesson["quiz"][number]; attempted: boolean; onAnswer: (correct: boolean) => void }) {
  const [picked, setPicked] = useState<number | null>(null);
  const answered = picked !== null;

  const pick = (i: number) => {
    if (answered) return;
    setPicked(i);
    onAnswer(i === question.answerIndex);
  };

  return (
    <div>
      <p className="text-sm font-medium">{question.question}</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {question.options.map((opt, i) => {
          const isAnswer = i === question.answerIndex;
          const isPicked = i === picked;
          return (
            <button
              key={opt}
              onClick={() => pick(i)}
              disabled={answered}
              className={clsx(
                "flex items-start gap-2 rounded-xl border px-3 py-2 text-left text-sm transition-colors",
                !answered && "border-line-strong hover:border-faint",
                answered && isAnswer && "border-ok bg-ok-soft",
                answered && isPicked && !isAnswer && "border-accent bg-accent-soft",
                answered && !isPicked && !isAnswer && "border-line opacity-60",
              )}
            >
              {answered && isAnswer && <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-ok" />}
              {answered && isPicked && !isAnswer && <XCircle className="mt-0.5 size-4 shrink-0 text-accent" />}
              {opt}
            </button>
          );
        })}
      </div>
      {answered && (
        <p className="mt-2 text-xs text-muted">
          {picked === question.answerIndex ? (attempted ? "Correct! " : "Correct! +15 XP. ") : "Not quite. "}
          {question.explanation}
        </p>
      )}
    </div>
  );
}
