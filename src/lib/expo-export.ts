import { EXPO_SDK_VERSION } from "./constants";
import { snackDependencies, type ProjectFiles } from "./project-files";

/** Turns studio files into a standalone Expo project the student can run locally. */

const SDK_MAJOR = EXPO_SDK_VERSION.split(".")[0];

export function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "lunor-app";
}

function readme(name: string): string {
  return `# ${name}

Built step by step with **Lunor App Studio** (Expo SDK ${SDK_MAJOR}, React Native).

## Run it

\`\`\`bash
npm install
npx expo install --fix   # aligns every package with Expo SDK ${SDK_MAJOR}
npx expo start           # scan the QR code with Expo Go, or press w for web
\`\`\`

## Project structure

- \`App.js\` — entry point and navigation
- \`src/screens\` — one file per screen
- \`src/components\` — reusable UI pieces
- \`src/context\` — app state + AsyncStorage persistence
- \`src/data\` — seed data
`;
}

export function exportFiles(name: string, files: ProjectFiles): Record<string, string> {
  const slug = slugify(name);
  const deps = Object.fromEntries(Object.keys(snackDependencies(files)).map((dep) => [dep, "*"]));

  const pkg = {
    name: slug,
    version: "1.0.0",
    main: "index.js",
    private: true,
    scripts: { start: "expo start", android: "expo start --android", ios: "expo start --ios", web: "expo start --web" },
    dependencies: {
      expo: `~${SDK_MAJOR}.0.0`,
      "expo-status-bar": "*",
      "@expo/vector-icons": "*",
      react: "*",
      "react-dom": "*",
      "react-native": "*",
      "react-native-web": "*",
      ...deps,
    },
  };

  const appJson = { expo: { name, slug, version: "1.0.0", orientation: "portrait", userInterfaceStyle: "automatic" } };
  const indexJs = `import { registerRootComponent } from 'expo';\nimport App from './App';\n\nregisterRootComponent(App);\n`;

  const scaffold: Record<string, string> = {
    "package.json": JSON.stringify(pkg, null, 2) + "\n",
    "app.json": JSON.stringify(appJson, null, 2) + "\n",
    "index.js": indexJs,
    "README.md": readme(name),
  };
  return { ...scaffold, ...files };
}

/** Zips the exported project under a top-level folder named after the app. */
export async function zipProject(name: string, files: ProjectFiles): Promise<Uint8Array> {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  const root = zip.folder(slugify(name));
  for (const [path, content] of Object.entries(exportFiles(name, files))) root?.file(path, content);
  return zip.generateAsync({ type: "uint8array" });
}
