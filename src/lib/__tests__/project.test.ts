import { describe, expect, test } from "vitest";
import {
  applyFiles,
  contentHash,
  createProject,
  nextMilestone,
  recordLesson,
  recordQuiz,
  recordChallenge,
  unlockedStages,
  type Project,
} from "../project";
import type { Plan } from "../schemas";

const plan = {
  milestones: [
    { id: "m1", title: "Shell", goal: "g", files: [], concepts: [] },
    { id: "m2", title: "Features", goal: "g", files: [], concepts: [] },
  ],
} as unknown as Plan;

function project(overrides: Partial<Project> = {}): Project {
  return { ...createProject("A habit tracker for students", "p1", 0), ...overrides };
}

describe("createProject", () => {
  test("starts in understand with empty artifacts", () => {
    const p = createProject("  idea text here  ", "id", 5);
    expect(p).toMatchObject({ id: "id", idea: "idea text here", currentStage: "understand", files: {}, createdAt: 5 });
    expect(p.progress.xp).toBe(0);
  });
});

describe("unlockedStages", () => {
  test("only understand is open for a fresh project", () => {
    expect(unlockedStages(project())).toEqual(["understand"]);
  });

  test("plan unlocks with a brief, build with an approved plan, explain+learn with code", () => {
    const withBrief = project({ brief: {} as Project["brief"] });
    expect(unlockedStages(withBrief)).toEqual(["understand", "plan"]);
    const approved = { ...withBrief, plan, planApproved: true };
    expect(unlockedStages(approved)).toEqual(["understand", "plan", "build"]);
    expect(unlockedStages({ ...approved, files: { "App.js": "x" } })).toEqual(["understand", "plan", "build", "explain", "learn"]);
  });
});

describe("nextMilestone", () => {
  test("returns the first unbuilt milestone, or undefined when done", () => {
    expect(nextMilestone(project({ plan }))?.id).toBe("m1");
    expect(nextMilestone(project({ plan, builtMilestones: ["m1"] }))?.id).toBe("m2");
    expect(nextMilestone(project({ plan, builtMilestones: ["m1", "m2"] }))).toBeUndefined();
    expect(nextMilestone(project())).toBeUndefined();
  });
});

describe("applyFiles", () => {
  test("merges without mutating the original and reports changed paths", () => {
    const original = { "App.js": "a", "src/x.js": "x" };
    const { files, changed } = applyFiles(original, [
      { path: "App.js", content: "b" },
      { path: "src/x.js", content: "x" },
      { path: "src/new.js", content: "n" },
    ]);
    expect(files).toEqual({ "App.js": "b", "src/x.js": "x", "src/new.js": "n" });
    expect(changed).toEqual(["App.js", "src/new.js"]);
    expect(original).toEqual({ "App.js": "a", "src/x.js": "x" });
  });

  test("drops unsafe paths", () => {
    const { files, changed } = applyFiles({}, [{ path: "../evil.js", content: "x" }]);
    expect(files).toEqual({});
    expect(changed).toEqual([]);
  });
});

describe("contentHash", () => {
  test("is stable and content-sensitive", () => {
    expect(contentHash("abc")).toBe(contentHash("abc"));
    expect(contentHash("abc")).not.toBe(contentHash("abd"));
  });
});

describe("progress", () => {
  test("lesson XP is awarded once", () => {
    const once = recordLesson(project().progress, "l1");
    const twice = recordLesson(once, "l1");
    expect(once.xp).toBe(20);
    expect(twice).toBe(once);
  });

  test("quiz XP only for a first correct answer", () => {
    let p = recordQuiz(project().progress, "l1:0", false);
    expect(p.xp).toBe(0);
    p = recordQuiz(p, "l1:0", true);
    expect(p.xp).toBe(0);
    p = recordQuiz(p, "l1:1", true);
    expect(p.xp).toBe(15);
  });

  test("challenge XP is awarded once", () => {
    const p = recordChallenge(recordChallenge(project().progress, "l1"), "l1");
    expect(p.xp).toBe(50);
    expect(p.challengesPassed).toEqual(["l1"]);
  });
});
