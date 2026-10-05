import { hasServerKey } from "@/lib/ai/gemini";

export function GET() {
  return Response.json({ aiEnabled: hasServerKey() });
}
