import { describe, expect, test } from "vitest";
import { exportFiles, slugify } from "../expo-export";

describe("slugify", () => {
  test.each([
    ["Habit Hero!", "habit-hero"],
    ["  Spaces   everywhere ", "spaces-everywhere"],
    ["日本", "lunor-app"],
  ])("%s -> %s", (input, out) => {
    expect(slugify(input)).toBe(out);
  });
});

describe("exportFiles", () => {
  const files = {
    "App.js": "import { NavigationContainer } from '@react-navigation/native';\nexport default function App() {}",
    "src/a.js": "import AsyncStorage from '@react-native-async-storage/async-storage';",
  };

  test("adds package.json with detected dependencies, app.json and README", () => {
    const out = exportFiles("Habit Hero", files);
    const pkg = JSON.parse(out["package.json"]);
    expect(pkg.name).toBe("habit-hero");
    expect(pkg.main).toBe("index.js");
    expect(Object.keys(pkg.dependencies)).toEqual(
      expect.arrayContaining(["expo", "react", "react-native", "@react-navigation/native", "react-native-screens", "@react-native-async-storage/async-storage"]),
    );
    expect(JSON.parse(out["app.json"]).expo.slug).toBe("habit-hero");
    expect(out["README.md"]).toContain("npx expo install --fix");
    expect(out["index.js"]).toContain("registerRootComponent");
    expect(out["App.js"]).toBe(files["App.js"]);
  });

  test("never overwrites user files with scaffolding", () => {
    const out = exportFiles("X", { ...files, "README.md": "mine" });
    expect(out["README.md"]).toBe("mine");
  });
});
