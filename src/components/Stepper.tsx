"use client";

import clsx from "clsx";
import { Check, Lock } from "lucide-react";
import { STAGE_META, STAGES, type Stage } from "@/lib/constants";

export function Stepper({ current, unlocked, done, onSelect }: { current: Stage; unlocked: Stage[]; done: Stage[]; onSelect: (s: Stage) => void }) {
  return (
    <nav aria-label="Studio stages" className="overflow-x-auto">
      <ol className="flex min-w-max items-center gap-1">
        {STAGES.map((stage, i) => {
          const isOpen = unlocked.includes(stage);
          const isCurrent = stage === current;
          const isDone = done.includes(stage);
          return (
            <li key={stage} className="flex items-center">
              {i > 0 && <span className={clsx("mx-1 h-px w-4 sm:w-6", isOpen ? "bg-accent/60" : "bg-line-strong")} aria-hidden />}
              <button
                onClick={() => isOpen && onSelect(stage)}
                disabled={!isOpen}
                aria-current={isCurrent ? "step" : undefined}
                className={clsx(
                  "flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                  isCurrent && "bg-accent text-white",
                  !isCurrent && isOpen && "text-fg hover:bg-surface-3",
                  !isOpen && "cursor-not-allowed text-faint",
                )}
              >
                <span
                  className={clsx(
                    "grid size-5 place-items-center rounded-full text-[11px] font-bold",
                    isCurrent ? "bg-white/20" : isDone ? "bg-ok-soft text-ok" : "bg-surface-3",
                  )}
                >
                  {isDone && !isCurrent ? <Check className="size-3" /> : !isOpen ? <Lock className="size-2.5" /> : i + 1}
                </span>
                {STAGE_META[stage].label}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
