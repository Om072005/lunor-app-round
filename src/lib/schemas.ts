import { z } from "zod";

/**
 * Zod schemas for every AI-produced artifact. The same schemas are converted to
 * JSON Schema for Gemini's structured output AND used to validate the response,
 * so a malformed model reply never reaches the UI.
 */

// ---------- Stage 1: Understand ----------

export const ClarifyQuestionSchema = z.object({
  id: z.string(),
  question: z.string(),
  why: z.string().describe("One sentence: why this answer changes how the app is built"),
  options: z.array(z.string()).min(2).max(5),
  multiSelect: z.boolean(),
});

export const UnderstandingSchema = z.object({
  summary: z.string().describe("The AI's one-paragraph read of the idea, in plain words"),
  appType: z.string().describe("e.g. Productivity, Social, E-commerce, Health"),
  complexity: z.enum(["starter", "intermediate", "advanced"]),
  similarApps: z.array(z.string()).max(4),
  questions: z.array(ClarifyQuestionSchema).min(3).max(5),
});

export const PersonaSchema = z.object({
  name: z.string(),
  description: z.string(),
  needs: z.array(z.string()).min(1).max(4),
});

export const FeatureSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  priority: z.enum(["must", "should", "could"]),
  userStory: z.string().describe("As a <user>, I want <goal> so that <benefit>"),
});

export const BriefSchema = z.object({
  name: z.string().describe("Short catchy app name"),
  tagline: z.string(),
  problem: z.string(),
  personas: z.array(PersonaSchema).min(1).max(3),
  features: z.array(FeatureSchema).min(3).max(10),
  outOfScope: z.array(z.string()).max(6),
  assumptions: z.array(z.string()).max(6),
});

// ---------- Stage 2: Plan ----------

export const StackDecisionSchema = z.object({
  choice: z.string(),
  reason: z.string(),
  alternatives: z
    .array(z.object({ name: z.string(), whyNot: z.string() }))
    .min(1)
    .max(3),
});

export const ScreenSchema = z.object({
  id: z.string().describe("PascalCase screen id, e.g. HomeScreen"),
  name: z.string(),
  purpose: z.string(),
  components: z.array(z.string()).max(8),
  navigatesTo: z.array(z.string()).describe("ids of screens reachable from here"),
});

export const EntitySchema = z.object({
  name: z.string(),
  description: z.string(),
  fields: z.array(z.object({ name: z.string(), type: z.string(), note: z.string() })).min(1).max(10),
});

export const MilestoneSchema = z.object({
  id: z.string(),
  title: z.string(),
  goal: z.string().describe("What the user can do in the app after this milestone"),
  files: z.array(z.string()).describe("Relative file paths created or changed"),
  concepts: z.array(z.string()).max(5).describe("React Native concepts introduced"),
});

export const PlanSchema = z.object({
  stack: StackDecisionSchema,
  navigation: z.object({
    pattern: z.enum(["stack", "tabs", "tabs+stack"]),
    reason: z.string(),
  }),
  storage: z.object({ choice: z.string(), reason: z.string(), productionUpgrade: z.string() }),
  screens: z.array(ScreenSchema).min(2).max(7),
  dataModel: z.array(EntitySchema).min(1).max(5),
  milestones: z.array(MilestoneSchema).min(2).max(4),
  risks: z.array(z.string()).max(4),
});

// ---------- Stage 4: Explain ----------

export const FileExplanationSchema = z.object({
  summary: z.string().describe("What this file does in one or two sentences"),
  role: z.string().describe("Where it sits in the app architecture"),
  sections: z
    .array(
      z.object({
        title: z.string(),
        startLine: z.number().int(),
        endLine: z.number().int(),
        explanation: z.string(),
        concept: z.string().describe("The React Native / JS concept this block demonstrates"),
      }),
    )
    .min(1)
    .max(8),
  gotchas: z.array(z.string()).max(3),
});

// ---------- Stage 5: Learn ----------

export const QuizQuestionSchema = z.object({
  question: z.string(),
  options: z.array(z.string()).min(3).max(4),
  answerIndex: z.number().int().min(0).max(3),
  explanation: z.string(),
});

export const LessonSchema = z.object({
  id: z.string(),
  concept: z.string(),
  roadmapLevel: z.number().int().min(1).max(30).describe("Matching Lunor App Dev roadmap level"),
  difficulty: z.enum(["beginner", "easy", "intermediate", "advanced"]),
  whyInYourApp: z.string(),
  fileRef: z.object({ path: z.string(), line: z.number().int() }),
  lesson: z.string().describe("Markdown micro-lesson, 120-220 words, may include short code snippets"),
  quiz: z.array(QuizQuestionSchema).min(2).max(3),
  challenge: z.object({
    task: z.string().describe("A small change the learner makes to THEIR app's code"),
    hint: z.string(),
    successCriteria: z.string(),
  }),
});

export const LearningPathSchema = z.object({
  overview: z.string(),
  lessons: z.array(LessonSchema).min(3).max(6),
  nextSteps: z.array(z.string()).max(4),
});

export const ChallengeReviewSchema = z.object({
  passed: z.boolean(),
  feedback: z.string(),
});

export type ClarifyQuestion = z.infer<typeof ClarifyQuestionSchema>;
export type Understanding = z.infer<typeof UnderstandingSchema>;
export type Brief = z.infer<typeof BriefSchema>;
export type Feature = z.infer<typeof FeatureSchema>;
export type Plan = z.infer<typeof PlanSchema>;
export type Screen = z.infer<typeof ScreenSchema>;
export type Milestone = z.infer<typeof MilestoneSchema>;
export type FileExplanation = z.infer<typeof FileExplanationSchema>;
export type Lesson = z.infer<typeof LessonSchema>;
export type LearningPath = z.infer<typeof LearningPathSchema>;
export type ChallengeReview = z.infer<typeof ChallengeReviewSchema>;
