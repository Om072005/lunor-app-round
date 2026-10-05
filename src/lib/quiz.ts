import type { LearningPath, Lesson } from "./schemas";

type QuizQuestion = Lesson["quiz"][number];

/** LLMs put the correct answer first far too often — shuffle so position never gives it away. */
export function shuffleQuiz(q: QuizQuestion, random: () => number = Math.random): QuizQuestion {
  const order = q.options.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return { ...q, options: order.map((i) => q.options[i]), answerIndex: order.indexOf(q.answerIndex) };
}

export function shuffleLearningPath(path: LearningPath, random: () => number = Math.random): LearningPath {
  return { ...path, lessons: path.lessons.map((l) => ({ ...l, quiz: l.quiz.map((q) => shuffleQuiz(q, random)) })) };
}
