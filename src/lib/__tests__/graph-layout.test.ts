import { describe, expect, test } from "vitest";
import { layeredLayout } from "../graph-layout";

describe("layeredLayout", () => {
  test("places nodes in BFS layers from the first root", () => {
    const pos = layeredLayout(["A", "B", "C", "D"], [
      ["A", "B"],
      ["A", "C"],
      ["B", "D"],
    ]);
    expect(pos.A.layer).toBe(0);
    expect(pos.B.layer).toBe(1);
    expect(pos.C.layer).toBe(1);
    expect(pos.D.layer).toBe(2);
    expect(pos.B.x).toBe(pos.C.x);
    expect(pos.B.y).not.toBe(pos.C.y);
  });

  test("handles cycles and unreachable nodes", () => {
    const pos = layeredLayout(["A", "B", "Z"], [
      ["A", "B"],
      ["B", "A"],
    ]);
    expect(pos.A.layer).toBe(0);
    expect(pos.B.layer).toBe(1);
    expect(pos.Z.layer).toBe(0);
  });

  test("ignores edges to unknown nodes", () => {
    const pos = layeredLayout(["A"], [["A", "Ghost"]]);
    expect(Object.keys(pos)).toEqual(["A"]);
  });

  test("returns empty layout for no nodes", () => {
    expect(layeredLayout([], [])).toEqual({});
  });
});
