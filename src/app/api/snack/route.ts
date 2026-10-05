import { AiError } from "@/lib/ai/errors";
import { SnackRequest } from "@/lib/api/requests";
import { handleAiRoute } from "@/lib/api/route-utils";
import { checkProject } from "@/lib/project-files";
import { saveSnack } from "@/lib/snack";

export const maxDuration = 60;

export function POST(request: Request) {
  return handleAiRoute(
    request,
    SnackRequest,
    async ({ body }) => {
      // Only publish projects that pass the studio checker, so this route can't host arbitrary code on Expo.
      const issues = checkProject(body.files);
      if (issues.length > 0) {
        throw new AiError("BAD_REQUEST", `Fix the project checker issues before publishing the preview (${issues[0].path}: ${issues[0].message})`);
      }
      return Response.json(await saveSnack(body.name, body.files));
    },
    { requiresKey: false, bucket: "snack", perMinute: 10 },
  );
}
