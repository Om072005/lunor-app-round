import { generateJson } from "@/lib/ai/gemini";
import { LEARN_SYSTEM, learnPrompt } from "@/lib/ai/prompts";
import { LearnRequest } from "@/lib/api/requests";
import { handleAiRoute } from "@/lib/api/route-utils";
import { shuffleLearningPath } from "@/lib/quiz";
import { LearningPathSchema } from "@/lib/schemas";

export const maxDuration = 120;

export function POST(request: Request) {
  return handleAiRoute(request, LearnRequest, async ({ body, apiKey }) => {
    const path = await generateJson({
      apiKey,
      tier: "quality",
      system: LEARN_SYSTEM,
      prompt: learnPrompt(body.brief, body.plan, body.files),
      schema: LearningPathSchema,
      temperature: 0.5,
    });
    return Response.json(shuffleLearningPath(path));
  });
}
