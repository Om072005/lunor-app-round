import { STAGES, XP, type Stage } from "./constants";
import type { GeneratedFile } from "./file-stream-parser";
import type { Level } from "./ai/prompts";
import { isSafePath } from "./project-files";
import type { Brief, FileExplanation, LearningPath, Milestone, Plan, Understanding } from "./schemas";
import type { SnackInfo } from "./snack-urls";

/** The single object every stage reads from and writes to. All helpers here are pure and immutable. */

export interface BuildLogEntry {
  id: string;
  kind: "milestone" | "change" | "fix";
  title: string;
  notes: string;
  changedFiles: string[];
  at: number;
}

export interface CachedExplanation {
  level: Level;
  hash: string;
  data: FileExplanation;
}

export interface Progress {
  xp: number;
  lessonsRead: string[];
  quizCorrect: string[];
  quizAttempted: string[];
  challengesPassed: string[];
}

export interface Project {
  id: string;
  idea: string;
  createdAt: number;
  updatedAt: number;
  isSample?: boolean;
  currentStage: Stage;
  understanding?: Understanding;
  answers: Record<string, string[]>;
  brief?: Brief;
  plan?: Plan;
  planApproved: boolean;
  files: Record<string, string>;
  builtMilestones: string[];
  buildLog: BuildLogEntry[];
  snack?: SnackInfo;
  snackHash?: string;
  explanations: Record<string, CachedExplanation>;
  learning?: LearningPath;
  progress: Progress;
}

export function createProject(idea: string, id: string, now: number): Project {
  return {
    id,
    idea: idea.trim(),
    createdAt: now,
    updatedAt: now,
    currentStage: "understand",
    answers: {},
    planApproved: false,
    files: {},
    builtMilestones: [],
    buildLog: [],
    explanations: {},
    progress: { xp: 0, lessonsRead: [], quizCorrect: [], quizAttempted: [], challengesPassed: [] },
  };
}

export function unlockedStages(p: Project): Stage[] {
  const open: Record<Stage, boolean> = {
    understand: true,
    plan: Boolean(p.brief),
    build: Boolean(p.plan && p.planApproved),
    explain: Object.keys(p.files).length > 0,
    learn: Object.keys(p.files).length > 0,
  };
  return STAGES.filter((s) => open[s]);
}

export function nextMilestone(p: Project): Milestone | undefined {
  return p.plan?.milestones.find((m) => !p.builtMilestones.includes(m.id));
}

export function applyFiles(
  current: Readonly<Record<string, string>>,
  generated: readonly GeneratedFile[],
): { files: Record<string, string>; changed: string[] } {
  const files = { ...current };
  const changed: string[] = [];
  for (const { path, content } of generated) {
    if (!isSafePath(path) || files[path] === content) continue;
    files[path] = content;
    changed.push(path);
  }
  return { files, changed };
}

/** Small non-cryptographic hash (FNV-1a) used to detect when cached explanations or previews are stale. */
export function contentHash(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

export function filesHash(files: Readonly<Record<string, string>>): string {
  return contentHash(Object.keys(files).sort().map((k) => `${k}\n${files[k]}`).join("\n\0"));
}

export function recordLesson(progress: Progress, lessonId: string): Progress {
  if (progress.lessonsRead.includes(lessonId)) return progress;
  return { ...progress, xp: progress.xp + XP.lessonRead, lessonsRead: [...progress.lessonsRead, lessonId] };
}

/** XP only for questions answered correctly on the first attempt — rewards thinking, not clicking through. */
export function recordQuiz(progress: Progress, questionKey: string, correct: boolean): Progress {
  if (progress.quizAttempted.includes(questionKey)) return progress;
  const attempted = [...progress.quizAttempted, questionKey];
  if (!correct) return { ...progress, quizAttempted: attempted };
  return { ...progress, xp: progress.xp + XP.quizCorrect, quizAttempted: attempted, quizCorrect: [...progress.quizCorrect, questionKey] };
}

export function recordChallenge(progress: Progress, lessonId: string): Progress {
  if (progress.challengesPassed.includes(lessonId)) return progress;
  return { ...progress, xp: progress.xp + XP.challengePassed, challengesPassed: [...progress.challengesPassed, lessonId] };
}
