/** Expo SDK the generated apps target. Must be one Snack supports (see snack-sdk getSupportedSDKVersions). */
export const EXPO_SDK_VERSION = "54.0.0";

/**
 * The only npm packages generated code may import. Keeping this list small is
 * what makes AI-generated apps run reliably in the Snack preview.
 * Value = version spec handed to Snack ("*" lets Snack pick the SDK-compatible one).
 */
export const ALLOWED_PACKAGES: Readonly<Record<string, string>> = {
  react: "*",
  "react-native": "*",
  expo: "*",
  "expo-status-bar": "*",
  "@expo/vector-icons": "*",
  "@react-navigation/native": "*",
  "@react-navigation/native-stack": "*",
  "@react-navigation/bottom-tabs": "*",
  "react-native-screens": "*",
  "react-native-safe-area-context": "*",
  "@react-native-async-storage/async-storage": "*",
};

/**
 * Packages Snack bundles by default, so they never need to be declared as dependencies.
 * Verified against snack-sdk's isModulePreloaded in tests — expo-status-bar is NOT preloaded.
 */
export const PRELOADED_PACKAGES = new Set(["react", "react-native", "expo", "@expo/vector-icons"]);

/** Peer dependencies that must ship alongside react-navigation. */
export const NAVIGATION_PEERS = ["react-native-screens", "react-native-safe-area-context"];

export const ENTRY_FILE = "App.js";

/** Input limits enforced on every API route. */
export const LIMITS = {
  ideaMinChars: 10,
  ideaMaxChars: 1000,
  instructionMaxChars: 600,
  maxFiles: 30,
  maxFileChars: 20_000,
  maxTotalChars: 200_000,
} as const;

export const STAGES = ["understand", "plan", "build", "explain", "learn"] as const;
export type Stage = (typeof STAGES)[number];

export const STAGE_META: Record<Stage, { label: string; blurb: string }> = {
  understand: { label: "Understand", blurb: "Clarify the idea into a brief" },
  plan: { label: "Plan", blurb: "Stack, screens, data & milestones" },
  build: { label: "Build", blurb: "Generate & preview, milestone by milestone" },
  explain: { label: "Explain", blurb: "Walk through your code" },
  learn: { label: "Learn", blurb: "Lessons from your own app" },
};

export const XP = { lessonRead: 20, quizCorrect: 15, challengePassed: 50 } as const;
