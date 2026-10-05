"use client";

import clsx from "clsx";
import { Info } from "lucide-react";
import { useState } from "react";
import { Card } from "@/components/ui";
import type { ClarifyQuestion } from "@/lib/schemas";

export function QuestionCard({
  question,
  index,
  selected,
  onChange,
}: {
  question: ClarifyQuestion;
  index: number;
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  const custom = selected.find((s) => !question.options.includes(s)) ?? "";
  const [other, setOther] = useState(custom);

  const toggle = (option: string) => {
    if (question.multiSelect) {
      onChange(selected.includes(option) ? selected.filter((s) => s !== option) : [...selected, option]);
    } else {
      onChange(selected.includes(option) ? [] : [option]);
    }
  };

  const commitOther = (value: string) => {
    const preset = selected.filter((s) => question.options.includes(s));
    const trimmed = value.trim().slice(0, 200);
    onChange(trimmed ? (question.multiSelect ? [...preset, trimmed] : [trimmed]) : preset);
  };

  return (
    <Card className="p-4">
      <p className="text-sm font-semibold">
        <span className="mr-2 text-accent">Q{index + 1}</span>
        {question.question}
      </p>
      <p className="mt-1.5 flex gap-1.5 text-xs text-faint">
        <Info className="mt-0.5 size-3 shrink-0" aria-hidden /> {question.why}
      </p>
      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label={question.question}>
        {question.options.map((option) => {
          const active = selected.includes(option);
          return (
            <button
              key={option}
              onClick={() => toggle(option)}
              aria-pressed={active}
              className={clsx(
                "rounded-full border px-3 py-1.5 text-xs transition-colors",
                active ? "border-accent bg-accent-soft text-fg" : "border-line-strong text-muted hover:border-faint hover:text-fg",
              )}
            >
              {option}
            </button>
          );
        })}
      </div>
      <input
        value={other}
        onChange={(e) => setOther(e.target.value)}
        onBlur={(e) => commitOther(e.target.value)}
        placeholder={question.multiSelect ? "Add your own (optional)" : "Or type your own answer"}
        aria-label={`Custom answer for: ${question.question}`}
        className="mt-3 w-full rounded-lg border border-line bg-bg px-3 py-1.5 text-xs outline-none focus:border-accent"
      />
    </Card>
  );
}
