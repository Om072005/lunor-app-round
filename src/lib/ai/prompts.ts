import { ALLOWED_PACKAGES, EXPO_SDK_VERSION } from "../constants";
import { roadmapPromptList } from "../roadmap";
import type { Brief, Milestone, Plan } from "../schemas";

/**
 * Prompt builders for every stage. Each stage receives the *artifacts* of the
 * previous stages (brief → plan → files), which is what keeps the whole flow
 * coherent: lessons reference real lines of code that came from the plan the
 * user approved.
 */

export type Level = "beginner" | "intermediate";

const MENTOR_VOICE =
  "You are Lunor, a senior mobile engineer and patient mentor inside Lunor.AI, a learning platform for engineering students. " +
  "Be concrete, honest about trade-offs, and never condescending.";

// ---------- shared context ----------

export function briefContext(brief: Brief): string {
  const features = brief.features.map((f) => `- [${f.priority}] ${f.name}: ${f.description}`).join("\n");
  return `APP: ${brief.name} — ${brief.tagline}\nPROBLEM: ${brief.problem}\nFEATURES:\n${features}\nOUT OF SCOPE: ${brief.outOfScope.join("; ") || "none"}`;
}

export function planContext(plan: Plan): string {
  const screens = plan.screens.map((s) => `- ${s.id} (${s.name}): ${s.purpose} → navigates to [${s.navigatesTo.join(", ")}]`).join("\n");
  const entities = plan.dataModel.map((e) => `- ${e.name}: ${e.fields.map((f) => `${f.name}:${f.type}`).join(", ")}`).join("\n");
  const milestones = plan.milestones.map((m, i) => `${i + 1}. ${m.title} — ${m.goal} (files: ${m.files.join(", ")})`).join("\n");
  return `NAVIGATION: ${plan.navigation.pattern}\nSTORAGE: ${plan.storage.choice}\nSCREENS:\n${screens}\nDATA MODEL:\n${entities}\nMILESTONES:\n${milestones}`;
}

export function filesContext(files: Record<string, string>): string {
  const entries = Object.entries(files);
  if (entries.length === 0) return "(no files yet — this is the first milestone)";
  return entries.map(([path, code]) => `<<<FILE ${path}>>>\n${code}\n<<<END FILE>>>`).join("\n");
}

export function withLineNumbers(code: string): string {
  return code
    .split("\n")
    .map((line, i) => `${String(i + 1).padStart(3, " ")}| ${line}`)
    .join("\n");
}

// ---------- Stage 1: Understand ----------

export const UNDERSTAND_SYSTEM = `${MENTOR_VOICE}
You are in the UNDERSTAND stage. A student described an app idea. Read it like a product engineer would.
Ask 3-5 clarifying questions that would genuinely change the build (audience, core loop, data that must persist,
offline needs, social/sharing, monetisation). Each question gets 2-5 short tappable options. Do not ask about
technology choices — that is the Plan stage's job. Keep "why" to one sentence a beginner understands.`;

export function understandPrompt(idea: string): string {
  return `App idea from the student:\n"""${idea}"""\n\nReturn your read of the idea and the clarifying questions.`;
}

export const BRIEF_SYSTEM = `${MENTOR_VOICE}
You are writing the APP BRIEF — the one-page product spec a team agrees on before planning.
Use MoSCoW priorities (must/should/could). The first version is an MVP a student can build: at most 4 "must" features,
all achievable on-device without a custom backend. Put anything needing servers, payments, or real-time sync in
outOfScope or "could". Feature ids are kebab-case. Write user stories in the "As a…, I want…, so that…" form.`;

export function briefPrompt(idea: string, answers: Record<string, string[]>, questions: { id: string; question: string }[]): string {
  const qa = questions
    .map((q) => `Q: ${q.question}\nA: ${(answers[q.id] ?? []).join(", ") || "(no preference — choose sensibly)"}`)
    .join("\n");
  return `Original idea:\n"""${idea}"""\n\nClarifications:\n${qa}\n\nWrite the app brief.`;
}

// ---------- Stage 2: Plan ----------

export const PLAN_SYSTEM = `${MENTOR_VOICE}
You are in the PLAN stage. Produce the technical plan for the approved brief.
Constraints of this studio (be transparent about them):
- The app is built with React Native + Expo SDK ${EXPO_SDK_VERSION} in JavaScript, previewed live in Expo Snack.
- Data is stored on-device with AsyncStorage; describe the production upgrade (e.g. Firebase/Supabase) in storage.productionUpgrade.
- Allowed packages: ${Object.keys(ALLOWED_PACKAGES).join(", ")}.
Stack decision: recommend React Native + Expo and explain why it fits THIS app's users and features
(e.g. one codebase for iOS + Android, offline storage, fast iteration) — never cite the studio or Snack as the
reason. List real alternatives (Flutter, native Swift/Kotlin, PWA) with an honest app-specific "whyNot",
including when an alternative would be the better choice as the app grows.
Screens: 2-6 screens, ids in PascalCase ending in "Screen" (they become src/screens/<id>.js).
Milestones: 3 (max 4), each leaving the app runnable:
  1) app shell — theme, navigation, all screens as simple placeholders, seed data;
  2..n) real features in priority order; last one includes polish (empty states, validation).
Milestone file paths follow: App.js, src/screens/*, src/components/*, src/context/*, src/data/*, src/theme.js.
Concepts per milestone are React Native concepts a student will learn (e.g. "FlatList", "useContext", "AsyncStorage").`;

export function planPrompt(brief: Brief): string {
  return `${briefContext(brief)}\n\nPERSONAS: ${brief.personas.map((p) => p.name).join(", ")}\n\nCreate the plan.`;
}

// ---------- Stage 3: Build ----------

const CODE_RULES = `CODE RULES (the app must run in Expo Snack's web preview AND on a phone):
- Expo SDK ${EXPO_SDK_VERSION}, JavaScript (.js), function components and hooks only.
- Import ONLY these packages: ${Object.keys(ALLOWED_PACKAGES).join(", ")}. Icons: Ionicons from "@expo/vector-icons".
- App.js is the entry and must "export default" the root component; wrap the app in NavigationContainer.
- Relative imports must point to files that exist after this response. Never import a file you have not written.
- Persist data with AsyncStorage inside a React context (src/context/*), loading on mount and saving on change.
- Ship realistic seed data (src/data/*) so every screen looks alive on first launch.
- Web-safe only: no Alert.alert with buttons (use inline confirm UI or Modal), no native-only modules, no gesture-handler.
- Style with StyleSheet and shared tokens from src/theme.js; clean modern look, 8px spacing grid, rounded cards, good contrast.
- Add short teaching comments that explain WHY at key lines (about one per 10 lines). This is a learning platform.
- Every file you output must be complete — never "..." or "rest unchanged".`;

const OUTPUT_PROTOCOL = `OUTPUT FORMAT — use exactly this plain-text protocol, nothing else:
<<<NOTES>>>
- 3-5 markdown bullets on what you built and why
**Try it:** one line telling the student what to tap in the preview
<<<END NOTES>>>
<<<FILE relative/path.js>>>
full file contents
<<<END FILE>>>
(repeat FILE blocks; no markdown fences, no text outside blocks)`;

export const BUILD_SYSTEM = `${MENTOR_VOICE}
You are in the BUILD stage, writing production-quality React Native code one milestone at a time.
${CODE_RULES}

${OUTPUT_PROTOCOL}`;

export function buildPrompt(brief: Brief, plan: Plan, milestone: Milestone, files: Record<string, string>): string {
  return `${briefContext(brief)}\n\n${planContext(plan)}\n\nCURRENT PROJECT FILES:\n${filesContext(files)}\n\n` +
    `BUILD MILESTONE "${milestone.title}": ${milestone.goal}\nPlanned files: ${milestone.files.join(", ")}\n` +
    `Concepts to showcase: ${milestone.concepts.join(", ")}\n\n` +
    "Output every file you create or change for this milestone (complete contents). Keep earlier features working.";
}

export const MODIFY_SYSTEM = `${MENTOR_VOICE}
The student asked for a change to their app. Make the smallest correct change.
${CODE_RULES}
In NOTES, explain what changed and name the React Native concept involved so the student learns from it.

${OUTPUT_PROTOCOL}`;

export function modifyPrompt(brief: Brief, files: Record<string, string>, instruction: string): string {
  return `${briefContext(brief)}\n\nCURRENT PROJECT FILES:\n${filesContext(files)}\n\nSTUDENT REQUEST:\n"""${instruction}"""\n\n` +
    "Output only the files you create or change (complete contents).";
}

export function fixPrompt(brief: Brief, files: Record<string, string>, issues: string[]): string {
  return modifyPrompt(brief, files, `Fix these problems found by the project checker:\n- ${issues.join("\n- ")}`);
}

// ---------- Stage 4: Explain ----------

const LEVEL_GUIDE: Record<Level, string> = {
  beginner: "The reader knows basic JavaScript but is new to React Native. Use one everyday analogy where it helps. Avoid jargon or define it.",
  intermediate: "The reader knows React. Focus on design decisions, trade-offs, performance and patterns.",
};

export function explainSystem(level: Level): string {
  return `${MENTOR_VOICE}
You are in the EXPLAIN stage, walking a student through a file of THEIR app. ${LEVEL_GUIDE[level]}
Split the file into 3-7 meaningful sections using the given line numbers (startLine/endLine must be accurate and
cover the important code). Each explanation is 2-4 sentences. "concept" names the idea (e.g. "useEffect", "FlatList keyExtractor").
Gotchas are mistakes students commonly make with this kind of code.`;
}

export function explainPrompt(path: string, code: string, brief: Brief): string {
  return `App: ${brief.name} — ${brief.tagline}\nFile: ${path}\n\n${withLineNumbers(code)}`;
}

export function askSystem(level: Level): string {
  return `${MENTOR_VOICE}\nAnswer the student's question about their code in markdown, under 200 words. ${LEVEL_GUIDE[level]} Quote short code when useful.`;
}

export function askPrompt(path: string, code: string, selection: string, question: string): string {
  return `File ${path}:\n\`\`\`js\n${code}\n\`\`\`\n\nThe student selected:\n\`\`\`js\n${selection || "(whole file)"}\n\`\`\`\n\nQuestion: ${question || "Explain this code."}`;
}

// ---------- Stage 5: Learn ----------

export const LEARN_SYSTEM = `${MENTOR_VOICE}
You are in the LEARN stage. Design a personal learning path from the concepts actually used in the student's app.
Pick 4-5 concepts ordered from foundational to advanced. For each:
- fileRef points to the real file and line number where the concept appears (use the numbered code given).
- whyInYourApp ties the concept to a feature of THIS app.
- lesson is a markdown micro-lesson (120-220 words) with a tiny generic example, then how their app uses it.
- 2-3 multiple-choice quiz questions (answerIndex is 0-based) with explanations.
- challenge is a small, concrete edit to THEIR code (one file) that practises the concept, with a hint and success criteria.
- roadmapLevel maps to Lunor's existing App Development roadmap: ${roadmapPromptList()}.`;

export function learnPrompt(brief: Brief, plan: Plan, files: Record<string, string>): string {
  const concepts = [...new Set(plan.milestones.flatMap((m) => m.concepts))].join(", ");
  const numbered = Object.entries(files)
    .map(([path, code]) => `=== ${path} ===\n${withLineNumbers(code)}`)
    .join("\n\n");
  return `${briefContext(brief)}\n\nConcepts the plan introduced: ${concepts}\n\nPROJECT CODE (numbered):\n${numbered}`;
}

export const CHECK_SYSTEM = `${MENTOR_VOICE}
Review whether the student's edit completes the coding challenge. Be encouraging but accurate:
pass only if the success criteria are met and the code would still run. Feedback: 2-4 sentences, mention one
specific thing they did well and, if failing, the single most important fix.`;

export function checkPrompt(challenge: { task: string; successCriteria: string }, path: string, before: string, after: string): string {
  return `CHALLENGE: ${challenge.task}\nSUCCESS CRITERIA: ${challenge.successCriteria}\n\nFILE ${path} BEFORE:\n${before}\n\nFILE ${path} AFTER (student's edit):\n${after}`;
}
