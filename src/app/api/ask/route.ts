import { streamText } from "@/lib/ai/gemini";
import { askPrompt, askSystem } from "@/lib/ai/prompts";
import { AskRequest } from "@/lib/api/requests";
import { handleAiRoute, textStreamResponse } from "@/lib/api/route-utils";

export const maxDuration = 60;

export function POST(request: Request) {
  return handleAiRoute(request, AskRequest, async ({ body, apiKey }) => {
    const stream = await streamText({
      apiKey,
      system: askSystem(body.level),
      prompt: askPrompt(body.path, body.code, body.selection, body.question),
      temperature: 0.5,
    });
    return textStreamResponse(stream);
  });
}
