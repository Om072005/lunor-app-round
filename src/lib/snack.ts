import "server-only";
import { Snack } from "snack-sdk";
import { AiError } from "./ai/errors";
import { EXPO_SDK_VERSION } from "./constants";
import { snackDependencies, type ProjectFiles } from "./project-files";
import { snackUrls, type SnackInfo } from "./snack-urls";

type SdkVersion = NonNullable<NonNullable<ConstructorParameters<typeof Snack>[0]>["sdkVersion"]>;

/**
 * Saves the project to Expo Snack's servers. A saved Snack can be embedded on any
 * domain (the live webPreviewURL session only works on localhost — expo/snack#535)
 * and opened on a real phone through Expo Go.
 */
export async function saveSnack(name: string, files: ProjectFiles): Promise<SnackInfo> {
  const snack = new Snack({
    name,
    description: `Built with Lunor App Studio`,
    sdkVersion: EXPO_SDK_VERSION as SdkVersion,
    files: Object.fromEntries(Object.entries(files).map(([path, contents]) => [path, { type: "CODE" as const, contents }])),
    dependencies: snackDependencies(files),
  });

  try {
    const { id, url } = await snack.saveAsync();
    return snackUrls(id, url);
  } catch (err) {
    console.error("[snack] save failed", err);
    throw new AiError("UPSTREAM", "Could not reach Expo Snack to build the preview. Try again in a moment.");
  }
}
