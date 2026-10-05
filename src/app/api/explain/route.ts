import { generateJson } from "@/lib/ai/gemini";
import { explainPrompt, explainSystem } from "@/lib/ai/prompts";
import { ExplainRequest } from "@/lib/api/requests";
import { handleAiRoute } from "@/lib/api/route-utils";
import { FileExplanationSchema } from "@/lib/schemas";

export const maxDuration = 60;

export function POST(request: Request) {
  return handleAiRoute(request, ExplainRequest, async ({ body, apiKey }) => {
    const explanation = await generateJson({
      apiKey,
      system: explainSystem(body.level),
      prompt: explainPrompt(body.path, body.code, body.brief),
      schema: FileExplanationSchema,
      temperature: 0.4,
    });
    return Response.json(explanation);
  });
}
