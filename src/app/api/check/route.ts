import { generateJson } from "@/lib/ai/gemini";
import { CHECK_SYSTEM, checkPrompt } from "@/lib/ai/prompts";
import { CheckRequest } from "@/lib/api/requests";
import { handleAiRoute } from "@/lib/api/route-utils";
import { ChallengeReviewSchema } from "@/lib/schemas";

export const maxDuration = 60;

export function POST(request: Request) {
  return handleAiRoute(request, CheckRequest, async ({ body, apiKey }) => {
    const review = await generateJson({
      apiKey,
      system: CHECK_SYSTEM,
      prompt: checkPrompt(body.challenge, body.path, body.before, body.after),
      schema: ChallengeReviewSchema,
      temperature: 0.2,
    });
    return Response.json(review);
  });
}
