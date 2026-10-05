import { describe, expect, test } from "vitest";
import { parseFileStream } from "../file-stream-parser";

describe("parseFileStream", () => {
  test("extracts notes and complete files", () => {
    const text = [
      "<<<NOTES>>>",
      "Built the home screen.",
      "<<<END NOTES>>>",
      "<<<FILE App.js>>>",
      "export default function App() {}",
      "<<<END FILE>>>",
      "<<<FILE src/screens/HomeScreen.js>>>",
      "const a = 1;",
      "<<<END FILE>>>",
    ].join("\n");

    const result = parseFileStream(text);

    expect(result.notes).toBe("Built the home screen.");
    expect(result.files).toEqual([
      { path: "App.js", content: "export default function App() {}\n" },
      { path: "src/screens/HomeScreen.js", content: "const a = 1;\n" },
    ]);
    expect(result.partial).toBeNull();
  });

  test("reports the file currently being streamed as partial", () => {
    const text = "<<<FILE App.js>>>\nimport React from 'react';\nexport def";

    const result = parseFileStream(text);

    expect(result.files).toEqual([]);
    expect(result.partial).toEqual({ path: "App.js", content: "import React from 'react';\nexport def" });
  });

  test("returns partial notes while notes are streaming", () => {
    const result = parseFileStream("<<<NOTES>>>\nAdding nav");
    expect(result.notes).toBe("Adding nav");
    expect(result.partial).toBeNull();
  });

  test("strips markdown code fences the model may wrap code in", () => {
    const text = "<<<FILE App.js>>>\n```javascript\nconst x = 1;\n```\n<<<END FILE>>>";
    expect(parseFileStream(text).files[0].content).toBe("const x = 1;\n");
  });

  test("ignores chatter outside of blocks and trims path whitespace", () => {
    const text = "Sure! Here you go.\n<<<FILE   App.js  >>>\nx\n<<<END FILE>>>\nHope that helps";
    expect(parseFileStream(text).files).toEqual([{ path: "App.js", content: "x\n" }]);
  });

  test("returns empty result for empty input", () => {
    expect(parseFileStream("")).toEqual({ notes: "", files: [], partial: null });
  });

  test("keeps the last version when a file is emitted twice", () => {
    const text = "<<<FILE a.js>>>\n1\n<<<END FILE>>>\n<<<FILE a.js>>>\n2\n<<<END FILE>>>";
    expect(parseFileStream(text).files).toEqual([{ path: "a.js", content: "2\n" }]);
  });
});
