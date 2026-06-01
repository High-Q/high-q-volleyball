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
      thresholds: {
        lines: 80,
        branches: 70,
        functions: 70,
        statements: 80,
      },
    },
  },
});
