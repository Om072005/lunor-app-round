"use client";

import { useCallback } from "react";
import { postJson } from "@/lib/api-client";
import { useAsyncAction, type ProjectUpdater } from "@/lib/hooks";
import { filesHash, type Project } from "@/lib/project";
import type { SnackInfo } from "@/lib/snack-urls";

/** Publishes the current files to Expo Snack and tracks whether the preview is stale. */
export function useSnackPreview(project: Project, update: ProjectUpdater) {
  const name = project.brief?.name ?? "Lunor app";

  const action = useAsyncAction(
    useCallback(
      async (signal: AbortSignal, files: Record<string, string>) => {
        const snack = await postJson<SnackInfo>("/api/snack", { name, files }, signal);
        update((p) => ({ ...p, snack, snackHash: filesHash(files) }));
      },
      [name, update],
    ),
  );

  const hasFiles = Object.keys(project.files).length > 0;
  const stale = hasFiles && project.snackHash !== filesHash(project.files);

  return { ...action, stale, snack: project.snack };
}
