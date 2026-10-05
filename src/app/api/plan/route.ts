import { generateJson } from "@/lib/ai/gemini";
import { PLAN_SYSTEM, planPrompt } from "@/lib/ai/prompts";
import { PlanRequest } from "@/lib/api/requests";
import { handleAiRoute } from "@/lib/api/route-utils";
import { PlanSchema } from "@/lib/schemas";

export const maxDuration = 90;

export function POST(request: Request) {
  return handleAiRoute(request, PlanRequest, async ({ body, apiKey }) => {
    const plan = await generateJson({ apiKey, tier: "quality", system: PLAN_SYSTEM, prompt: planPrompt(body.brief), schema: PlanSchema, temperature: 0.5 });
    return Response.json(plan);
  });
}
