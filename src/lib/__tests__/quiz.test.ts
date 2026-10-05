import { describe, expect, test } from "vitest";
import { shuffleQuiz } from "../quiz";

const question = { question: "q", options: ["right", "w1", "w2", "w3"], answerIndex: 0, explanation: "e" };

describe("shuffleQuiz", () => {
  test("keeps the correct answer pointing at the same option text", () => {
    for (let seed = 0; seed < 20; seed++) {
      const shuffled = shuffleQuiz(question, () => ((seed * 9301 + 49297) % 233280) / 233280);
      expect(shuffled.options[shuffled.answerIndex]).toBe("right");
      expect([...shuffled.options].sort()).toEqual([...question.options].sort());
    }
  });

  test("moves the answer away from index 0 for some random draws", () => {
    const positions = new Set<number>();
    let s = 1;
    const rand = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
    for (let i = 0; i < 50; i++) positions.add(shuffleQuiz(question, rand).answerIndex);
    expect(positions.size).toBeGreaterThan(1);
  });

  test("does not mutate the input", () => {
    shuffleQuiz(question, () => 0.5);
    expect(question.options).toEqual(["right", "w1", "w2", "w3"]);
  });
});
