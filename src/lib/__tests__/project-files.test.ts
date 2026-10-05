import { getSupportedSDKVersions, isModulePreloaded } from "snack-sdk";
import { describe, expect, test } from "vitest";
import { EXPO_SDK_VERSION, PRELOADED_PACKAGES } from "../constants";
import {
  buildImportGraph,
  checkProject,
  classifyFile,
  extractImports,
  isSafePath,
  packageName,
  resolveImport,
  snackDependencies,
} from "../project-files";

describe("extractImports", () => {
  test("finds import, side-effect import, re-export and require specifiers", () => {
    const code = [
      "import React, { useState } from 'react';",
      'import { View } from "react-native";',
      "import './polyfill';",
      "export { default as Card } from './Card';",
      "const store = require('@react-native-async-storage/async-storage');",
      "import {",
      "  NavigationContainer,",
      "} from '@react-navigation/native';",
    ].join("\n");

    expect(extractImports(code)).toEqual([
      "react",
      "react-native",
      "./polyfill",
      "./Card",
      "@react-native-async-storage/async-storage",
      "@react-navigation/native",
    ]);
  });

  test("ignores imports inside comments", () => {
    expect(extractImports("// import x from 'lodash'\n/* import y from 'moment' */")).toEqual([]);
  });
});

describe("packageName", () => {
  test.each([
    ["react", "react"],
    ["@expo/vector-icons/Ionicons", "@expo/vector-icons"],
    ["@react-navigation/native", "@react-navigation/native"],
    ["lodash/map", "lodash"],
  ])("%s -> %s", (spec, expected) => {
    expect(packageName(spec)).toBe(expected);
  });
});

describe("isSafePath", () => {
  test.each(["App.js", "src/screens/Home.js", "src/theme.ts", "src/data/seed.json"])("accepts %s", (p) => {
    expect(isSafePath(p)).toBe(true);
  });
  test.each(["../etc/passwd", "/abs.js", "src/../../x.js", "a b.js", "script.sh", "", "src\\win.js"])(
    "rejects %s",
    (p) => {
      expect(isSafePath(p)).toBe(false);
    },
  );
});

describe("resolveImport", () => {
  const files = { "App.js": "", "src/screens/Home.js": "", "src/components/index.js": "", "src/theme.ts": "" };

  test("resolves relative paths with implicit extensions and index files", () => {
    expect(resolveImport("App.js", "./src/screens/Home", files)).toBe("src/screens/Home.js");
    expect(resolveImport("src/screens/Home.js", "../components", files)).toBe("src/components/index.js");
    expect(resolveImport("src/screens/Home.js", "../theme", files)).toBe("src/theme.ts");
  });

  test("returns null for missing files", () => {
    expect(resolveImport("App.js", "./src/Missing", files)).toBeNull();
  });
});

describe("checkProject", () => {
  test("passes a valid project", () => {
    const files = {
      "App.js": "import Home from './src/Home';\nexport default function App() { return <Home/>; }",
      "src/Home.js": "import { View } from 'react-native';\nexport default function Home() {}",
    };
    expect(checkProject(files)).toEqual([]);
  });

  test("flags missing entry, unknown packages and broken relative imports", () => {
    const files = {
      "src/Home.js": "import axios from 'axios';\nimport Card from './Card';\nexport default 1;",
    };
    const kinds = checkProject(files).map((i) => i.kind);
    expect(kinds).toContain("missing-entry");
    expect(kinds).toContain("unknown-package");
    expect(kinds).toContain("missing-file");
  });

  test("flags JavaScript/JSX syntax errors with a line number", () => {
    const files = {
      "App.js": "export default function App() { return <View><Text>hi</Text></View>; }",
      "src/Broken.js": "export default function B() {\n  return (\n    <View>\n  );\n}\n<<<END FILE>",
    };
    const issues = checkProject(files);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ path: "src/Broken.js", kind: "syntax-error" });
    expect(issues[0].message).toMatch(/line \d+/);
  });

  test("accepts modern JS: optional chaining, spread, async, template literals", () => {
    const code = "export default async function f(a) { const x = a?.b ?? {...a}; await g(`v${x}`); return <A {...x} />; }";
    expect(checkProject({ "App.js": code })).toEqual([]);
  });

  test("flags entry without default export", () => {
    const issues = checkProject({ "App.js": "const App = () => null;" });
    expect(issues.map((i) => i.kind)).toEqual(["no-default-export"]);
  });
});

describe("Snack compatibility", () => {
  test("every package we treat as preloaded really is preloaded by Snack", () => {
    for (const name of PRELOADED_PACKAGES) expect(isModulePreloaded(name, EXPO_SDK_VERSION as never), name).toBe(true);
  });

  test("the target Expo SDK is supported by Snack", () => {
    expect(getSupportedSDKVersions()).toContain(EXPO_SDK_VERSION);
  });

  test("expo-status-bar is declared as a dependency (it is not preloaded)", () => {
    expect(snackDependencies({ "App.js": "import { StatusBar } from 'expo-status-bar';" })).toHaveProperty("expo-status-bar");
  });
});

describe("snackDependencies", () => {
  test("declares only non-preloaded packages and adds navigation peers", () => {
    const files = {
      "App.js": "import { NavigationContainer } from '@react-navigation/native';\nimport { View } from 'react-native';",
      "src/a.js": "import AsyncStorage from '@react-native-async-storage/async-storage';",
    };
    expect(Object.keys(snackDependencies(files)).sort()).toEqual([
      "@react-native-async-storage/async-storage",
      "@react-navigation/native",
      "react-native-safe-area-context",
      "react-native-screens",
    ]);
  });
});

describe("classifyFile & buildImportGraph", () => {
  test("classifies by conventional folders", () => {
    expect(classifyFile("App.js")).toBe("entry");
    expect(classifyFile("src/screens/HomeScreen.js")).toBe("screen");
    expect(classifyFile("src/components/Card.js")).toBe("component");
    expect(classifyFile("src/context/HabitContext.js")).toBe("state");
    expect(classifyFile("src/data/seed.js")).toBe("data");
    expect(classifyFile("src/theme.js")).toBe("other");
  });

  test("builds edges only between project files", () => {
    const files = {
      "App.js": "import Home from './src/screens/Home';\nimport { View } from 'react-native';",
      "src/screens/Home.js": "import Card from '../components/Card';",
      "src/components/Card.js": "",
    };
    const graph = buildImportGraph(files);
    expect(graph.nodes.map((n) => n.id).sort()).toEqual(["App.js", "src/components/Card.js", "src/screens/Home.js"]);
    expect(graph.edges).toEqual([
      { from: "App.js", to: "src/screens/Home.js" },
      { from: "src/screens/Home.js", to: "src/components/Card.js" },
    ]);
  });
});
