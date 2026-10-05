import { SnackRequest } from "@/lib/api/requests";
import { handleAiRoute } from "@/lib/api/route-utils";
import { saveSnack } from "@/lib/snack";

export const maxDuration = 60;

export function POST(request: Request) {
  return handleAiRoute(request, SnackRequest, async ({ body }) => Response.json(await saveSnack(body.name, body.files)), {
    requiresKey: false,
  });
}
