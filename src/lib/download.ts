"use client";

import { slugify, zipProject } from "./expo-export";
import type { ProjectFiles } from "./project-files";

/** Browser-only: builds the Expo project zip and triggers a download. */
export async function downloadProjectZip(name: string, files: ProjectFiles): Promise<void> {
  const bytes = await zipProject(name, files);
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/zip" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slugify(name)}.zip`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
