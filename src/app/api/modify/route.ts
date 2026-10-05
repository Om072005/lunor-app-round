import { streamText } from "@/lib/ai/gemini";
import { MODIFY_SYSTEM, fixPrompt, modifyPrompt } from "@/lib/ai/prompts";
import { ModifyRequest } from "@/lib/api/requests";
import { handleAiRoute, textStreamResponse } from "@/lib/api/route-utils";

export const maxDuration = 300;

export function POST(request: Request) {
  return handleAiRoute(request, ModifyRequest, async ({ body, apiKey }) => {
    const prompt =
      body.mode === "fix"
        ? fixPrompt(body.brief, body.files, body.issues ?? [])
        : modifyPrompt(body.brief, body.files, body.instruction ?? "");
    const stream = await streamText({ apiKey, tier: "quality", system: MODIFY_SYSTEM, prompt, temperature: 0.3 });
    return textStreamResponse(stream);
  });
}
