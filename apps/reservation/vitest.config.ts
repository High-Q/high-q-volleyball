import path from "node:path";
import { fileURLToPath } from "node:url";
import Vue from "@vitejs/plugin-vue";
import { defineConfig } from "vitest/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [Vue()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: false,
    environment: "jsdom",
    include: ["src/**/*.spec.{ts,tsx,js,jsx}"],
    setupFiles: ["./src/test/setup.ts"],
    css: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      include: ["src/**/*.{ts,tsx,vue}"],
      exclude: [
        "src/**/*.spec.{ts,tsx}",
        "src/test/**",
        "src/**/*.d.ts",
        "src/main.ts",
        "src/env.d.ts",
      ],
      // baseline 計測: lines 93.25 / branches 85.75 / functions 82.87 / statements 93.25
      // design.md D8 (段階導入): 実測 -10% を初期値。Group 8 で追加の error 修正後に再計測。
      // vitest 4 再 baseline (deps-vuln-sweep-2026-10): coverage-v8 v4 の AST-aware remapping
      // 既定化で実コード不変のまま計測値が低下 (lines 77.88 / stmts 76.77 / branches 69.75 /
      // funcs 70.39)。実質的な基準引き上げを避けるため v4 実測の直下へ再設定。引き上げは #312。
      thresholds: {
        lines: 76,
        branches: 68,
        functions: 69,
        statements: 75,
      },
    },
  },
});
