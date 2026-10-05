import JSZip from "jszip";
import { describe, expect, test, vi } from "vitest";
import { zipProject } from "../expo-export";
import { filesHash } from "../project";
import { shuffleLearningPath } from "../quiz";
import { LUNOR_APP_DEV_ROADMAP, roadmapLevel, roadmapPromptList } from "../roadmap";
import { snackUrls } from "../snack-urls";
import type { LearningPath } from "../schemas";

vi.mock("server-only", () => ({}));

describe("roadmap", () => {
  test("mirrors Lunor's 30-level App Development track", () => {
    expect(LUNOR_APP_DEV_ROADMAP).toHaveLength(30);
    expect(roadmapLevel(6)?.title).toBe("Navigation");
    expect(roadmapLevel(99)).toBeUndefined();
    expect(roadmapPromptList()).toMatch(/^LV1 Mobile Basics, LV2 React Native Setup/);
  });
});

describe("snackUrls", () => {
  test("builds embed, editor and Expo Go URLs with an encoded id", () => {
    const urls = snackUrls("a/b", "exp://u.expo.dev/x");
    expect(urls.embedUrl).toMatch(/^https:\/\/snack\.expo\.dev\/embedded\/a%2Fb\?preview=true&platform=web/);
    expect(urls.webUrl).toBe("https://snack.expo.dev/a%2Fb");
    expect(urls.expoUrl).toBe("exp://u.expo.dev/x");
  });
});

describe("filesHash", () => {
  test("is order-independent and changes with any content", () => {
    expect(filesHash({ a: "1", b: "2" })).toBe(filesHash({ b: "2", a: "1" }));
    expect(filesHash({ a: "1" })).not.toBe(filesHash({ a: "2" }));
  });
});

describe("shuffleLearningPath", () => {
  test("shuffles every quiz while keeping answers correct", () => {
    const path = {
      overview: "",
      nextSteps: [],
      lessons: [{ quiz: [{ question: "q", options: ["right", "x", "y"], answerIndex: 0, explanation: "" }] }],
    } as unknown as LearningPath;
    const out = shuffleLearningPath(path, () => 0);
    const q = out.lessons[0].quiz[0];
    expect(q.options[q.answerIndex]).toBe("right");
  });
});

describe("zipProject", () => {
  test("produces a runnable Expo project inside a named folder", async () => {
    const bytes = await zipProject("Habit Pulse", { "App.js": "export default function App() {}" });
    const zip = await JSZip.loadAsync(bytes);
    const names = Object.keys(zip.files);
    expect(names).toEqual(expect.arrayContaining(["habit-pulse/App.js", "habit-pulse/package.json", "habit-pulse/README.md"]));
    expect(await zip.file("habit-pulse/App.js")!.async("string")).toContain("export default");
  });
});

describe("saveSnack", () => {
  test("saves files with detected dependencies and returns preview URLs", async () => {
    const saveAsync = vi.fn().mockResolvedValue({ id: "abc", url: "exp://x" });
    const ctor = vi.fn();
    vi.doMock("snack-sdk", () => ({
      Snack: vi.fn().mockImplementation(function (opts: unknown) {
        ctor(opts);
        return { saveAsync };
      }),
    }));
    const { saveSnack } = await import("../snack");
    const info = await saveSnack("App", { "App.js": "import { NavigationContainer } from '@react-navigation/native';" });
    expect(info.embedUrl).toContain("/embedded/abc");
    const opts = ctor.mock.calls[0][0] as { dependencies: Record<string, unknown>; files: Record<string, { type: string }> };
    expect(Object.keys(opts.dependencies)).toContain("react-native-screens");
    expect(opts.files["App.js"].type).toBe("CODE");

    saveAsync.mockRejectedValueOnce(new Error("network"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(saveSnack("App", { "App.js": "" })).rejects.toThrow(/Expo Snack/);
    vi.doUnmock("snack-sdk");
  });
});
