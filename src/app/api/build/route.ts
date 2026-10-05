import { AiError } from "@/lib/ai/errors";
import { streamText } from "@/lib/ai/gemini";
import { BUILD_SYSTEM, buildPrompt } from "@/lib/ai/prompts";
import { BuildRequest } from "@/lib/api/requests";
import { handleAiRoute, textStreamResponse } from "@/lib/api/route-utils";

export const maxDuration = 300;

/** Code generation is the most expensive call on the shared free-tier key. */
const CODEGEN_LIMIT = { bucket: "codegen", perMinute: 6 };

export function POST(request: Request) {
  return handleAiRoute(request, BuildRequest, async ({ body, apiKey }) => {
    const milestone = body.plan.milestones.find((m) => m.id === body.milestoneId);
    if (!milestone) throw new AiError("BAD_REQUEST", "Unknown milestone.");
    const stream = await streamText({
      apiKey,
      tier: "quality",
      system: BUILD_SYSTEM,
      prompt: buildPrompt(body.brief, body.plan, milestone, body.files),
      temperature: 0.4,
    });
    return textStreamResponse(stream);
  }, CODEGEN_LIMIT);
}
