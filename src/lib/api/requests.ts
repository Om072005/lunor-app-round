import { z } from "zod";
import { LIMITS } from "../constants";
import { isSafePath } from "../project-files";
import { BriefSchema, ClarifyQuestionSchema, LessonSchema, PlanSchema } from "../schemas";

/** Request body schemas for every API route — the system boundary where untrusted input is validated. */

export const FilesSchema = z
  .record(z.string(), z.string().max(LIMITS.maxFileChars, "A file is too large."))
  .refine((files) => Object.keys(files).length <= LIMITS.maxFiles, `Projects are limited to ${LIMITS.maxFiles} files.`)
  .refine((files) => Object.keys(files).every(isSafePath), "Invalid file path.")
  .refine(
    (files) => Object.values(files).reduce((n, c) => n + c.length, 0) <= LIMITS.maxTotalChars,
    "Project is too large.",
  );

const Idea = z.string().trim().min(LIMITS.ideaMinChars, "Describe your idea in a bit more detail.").max(LIMITS.ideaMaxChars);
const Level = z.enum(["beginner", "intermediate"]).default("beginner");
const SafePath = z.string().refine(isSafePath, "Invalid file path.");
const Code = z.string().max(LIMITS.maxFileChars);

export const UnderstandRequest = z.object({ idea: Idea });

export const BriefRequest = z.object({
  idea: Idea,
  questions: z.array(ClarifyQuestionSchema).max(6),
  answers: z.record(z.string(), z.array(z.string().max(200)).max(6)),
});

export const PlanRequest = z.object({ brief: BriefSchema });

export const BuildRequest = z.object({
  brief: BriefSchema,
  plan: PlanSchema,
  milestoneId: z.string(),
  files: FilesSchema,
});

export const ModifyRequest = z.object({
  brief: BriefSchema,
  files: FilesSchema,
  mode: z.enum(["change", "fix"]),
  instruction: z.string().trim().max(LIMITS.instructionMaxChars).optional(),
  issues: z.array(z.string().max(300)).max(20).optional(),
}).refine((r) => (r.mode === "change" ? Boolean(r.instruction) : Boolean(r.issues?.length)), "Nothing to change.");

export const ExplainRequest = z.object({ path: SafePath, code: Code, brief: BriefSchema, level: Level });

export const AskRequest = z.object({
  path: SafePath,
  code: Code,
  selection: z.string().max(LIMITS.maxFileChars).default(""),
  question: z.string().trim().max(LIMITS.instructionMaxChars).default(""),
  level: Level,
});

export const LearnRequest = z.object({ brief: BriefSchema, plan: PlanSchema, files: FilesSchema });

export const CheckRequest = z.object({
  challenge: LessonSchema.shape.challenge,
  path: SafePath,
  before: Code,
  after: Code,
});

export const SnackRequest = z.object({
  name: z.string().trim().min(1).max(60),
  files: FilesSchema.refine((f) => Object.keys(f).length > 0, "No files to preview."),
});
