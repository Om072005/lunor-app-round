import { generateJson } from "@/lib/ai/gemini";
import { UNDERSTAND_SYSTEM, understandPrompt } from "@/lib/ai/prompts";
import { UnderstandRequest } from "@/lib/api/requests";
import { handleAiRoute } from "@/lib/api/route-utils";
import { UnderstandingSchema } from "@/lib/schemas";

export const maxDuration = 60;

export function POST(request: Request) {
  return handleAiRoute(request, UnderstandRequest, async ({ body, apiKey }) => {
    const understanding = await generateJson({ apiKey, system: UNDERSTAND_SYSTEM, prompt: understandPrompt(body.idea), schema: UnderstandingSchema });
    return Response.json(understanding);
  });
}
