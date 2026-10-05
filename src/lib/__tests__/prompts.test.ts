import { describe, expect, test } from "vitest";
import * as P from "../ai/prompts";
import type { Brief, Plan } from "../schemas";

const brief: Brief = {
  name: "HabitPulse",
  tagline: "Build consistency",
  problem: "Students break habits",
  personas: [{ name: "Sam", description: "student", needs: ["reminders"] }],
  features: [{ id: "check-in", name: "Check-in", description: "Daily tick", priority: "must", userStory: "As a…" }],
  outOfScope: [],
  assumptions: [],
};

const plan = {
  stack: { choice: "RN", reason: "r", alternatives: [] },
  navigation: { pattern: "tabs", reason: "r" },
  storage: { choice: "AsyncStorage", reason: "r", productionUpgrade: "Supabase" },
  screens: [{ id: "HomeScreen", name: "Home", purpose: "List", components: [], navigatesTo: ["StatsScreen"] }],
  dataModel: [{ name: "Habit", description: "d", fields: [{ name: "title", type: "string", note: "" }] }],
  milestones: [{ id: "m1", title: "Shell", goal: "Runs", files: ["App.js"], concepts: ["FlatList", "useState"] }],
  risks: [],
} as Plan;

describe("prompt context builders", () => {
  test("brief and plan context carry the facts later stages depend on", () => {
    expect(P.briefContext(brief)).toContain("[must] Check-in");
    expect(P.briefContext(brief)).toContain("OUT OF SCOPE: none");
    const ctx = P.planContext(plan);
    expect(ctx).toContain("HomeScreen (Home)");
    expect(ctx).toContain("navigates to [StatsScreen]");
    expect(ctx).toContain("Habit: title:string");
  });

  test("filesContext uses the same block protocol the model must answer in", () => {
    expect(P.filesContext({})).toMatch(/first milestone/);
    expect(P.filesContext({ "App.js": "x" })).toBe("<<<FILE App.js>>>\nx\n<<<END FILE>>>");
  });

  test("withLineNumbers numbers every line for accurate references", () => {
    expect(P.withLineNumbers("a\nb")).toBe("  1| a\n  2| b");
  });
});

describe("stage prompts", () => {
  test("understand and brief embed the idea and answers", () => {
    expect(P.understandPrompt("my idea")).toContain("my idea");
    const bp = P.briefPrompt("idea", { q1: ["Yes"] }, [{ id: "q1", question: "Offline?" }, { id: "q2", question: "Social?" }]);
    expect(bp).toContain("Q: Offline?\nA: Yes");
    expect(bp).toContain("choose sensibly");
  });

  test("build, modify and fix prompts include project files and the request", () => {
    const build = P.buildPrompt(brief, plan, plan.milestones[0], { "App.js": "code" });
    expect(build).toContain('BUILD MILESTONE "Shell"');
    expect(build).toContain("FlatList, useState");
    expect(P.modifyPrompt(brief, {}, "make it blue")).toContain("make it blue");
    expect(P.fixPrompt(brief, {}, ["App.js: missing"])).toContain("- App.js: missing");
  });

  test("system prompts enforce the web-safe whitelist and output protocol", () => {
    expect(P.BUILD_SYSTEM).toContain("@react-navigation/native");
    expect(P.BUILD_SYSTEM).toContain("<<<END FILE>>>");
    expect(P.BUILD_SYSTEM).toContain("no Alert.alert with buttons");
    expect(P.PLAN_SYSTEM).toContain("never cite the studio");
  });

  test("explain and ask adapt to the learner level", () => {
    expect(P.explainSystem("beginner")).toContain("analogy");
    expect(P.explainSystem("intermediate")).toContain("trade-offs");
    expect(P.explainPrompt("App.js", "x", brief)).toContain("  1| x");
    expect(P.askSystem("beginner")).toContain("under 200 words");
    expect(P.askPrompt("App.js", "code", "", "")).toContain("(whole file)");
  });

  test("learn maps to the Lunor roadmap and check compares before/after", () => {
    expect(P.LEARN_SYSTEM).toContain("LV5 Lists & ScrollViews");
    const learn = P.learnPrompt(brief, plan, { "App.js": "line" });
    expect(learn).toContain("=== App.js ===\n  1| line");
    expect(learn).toContain("FlatList, useState");
    expect(P.checkPrompt({ task: "t", successCriteria: "c" }, "App.js", "old", "new")).toMatch(/BEFORE:\nold[\s\S]*AFTER[\s\S]*new/);
  });
});
