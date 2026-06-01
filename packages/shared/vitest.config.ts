import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: false,
    environment: "node",
    include: ["src/**/*.spec.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.spec.ts", "src/**/*.d.ts", "src/index.ts"],
      // baseline 計測: lines 75.23 / branches 84.81 / functions 76.47 / statements 75.23
      // 段階導入: 実測 -10% を初期値
      thresholds: {
        lines: 65,
        branches: 70,
        functions: 65,
        statements: 65,
      },
    },
  },
});
