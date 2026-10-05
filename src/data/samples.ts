import type { Project } from "@/lib/project";

/**
 * Fully built sample projects, recorded from real runs of the pipeline
 * (scripts/record-sample.ts). They let anyone walk every stage instantly — even
 * with no API key or exhausted free-tier quota. The JSON is loaded on click so
 * the landing page stays light.
 */
export interface SampleMeta {
  slug: string;
  name: string;
  emoji: string;
  blurb: string;
  stats: string[];
  load: () => Promise<Project>;
}

const asProject = (m: { default: unknown }) => m.default as Project;

export const SAMPLES: SampleMeta[] = [
  {
    slug: "habit-tracker",
    name: "HabitPulse — habit tracker",
    emoji: "🔥",
    blurb: "Daily check-ins, streaks and a weekly progress grid for college students.",
    stats: ["3 milestones", "8 files", "5 lessons"],
    load: () => import("./samples/habit-tracker.json").then(asProject),
  },
  {
    slug: "expense-splitter",
    name: "SplitFlat — roommate expense splitter",
    emoji: "💸",
    blurb: "Log shared bills, see live balances and settle up who owes whom.",
    stats: ["3 milestones", "13 files", "6 screens", "4 lessons"],
    load: () => import("./samples/expense-splitter.json").then(asProject),
  },
];
