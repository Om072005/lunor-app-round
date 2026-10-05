import { generateJson } from "@/lib/ai/gemini";
import { BRIEF_SYSTEM, briefPrompt } from "@/lib/ai/prompts";
import { BriefRequest } from "@/lib/api/requests";
import { handleAiRoute } from "@/lib/api/route-utils";
import { BriefSchema } from "@/lib/schemas";

export const maxDuration = 60;

export function POST(request: Request) {
  return handleAiRoute(request, BriefRequest, async ({ body, apiKey }) => {
    const brief = await generateJson({
      apiKey,
      system: BRIEF_SYSTEM,
      prompt: briefPrompt(body.idea, body.answers, body.questions),
      schema: BriefSchema,
    });
    return Response.json(brief);
  });
}
