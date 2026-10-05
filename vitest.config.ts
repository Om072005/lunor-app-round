import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
    coverage: {
      provider: "v8",
      include: ["src/lib/**/*.ts"],
      exclude: ["src/lib/**/__tests__/**", "src/lib/api-client.ts", "src/lib/store.ts"],
      thresholds: { lines: 80, functions: 80, statements: 80, branches: 75 },
    },
  },
});
