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
    // CI 弱 runner で router.spec の lazy import 解決が default 5s を超えて
    // flaky 失敗するため 10s に拡張 (#171 ship 時の対応)。
    // ローカルでは router.spec は 1s 程度で完了するため通常テストへの
    // 影響なし。本来は test 自体を更に軽くしたいが、現状は timeout 拡張で安定化。
    testTimeout: 10000,
    hookTimeout: 10000,
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
      // baseline 計測: lines 89.7 / branches 87.59 / functions 77.4 / statements 89.7
      // design.md D8 (段階導入): 実測 -10% を初期値。Group 8 で追加の error 修正後に再計測。
      // vitest 4 再 baseline (deps-vuln-sweep-2026-10): coverage-v8 v4 の AST-aware remapping
      // 既定化で実コード不変のまま計測値が低下 (lines 75.24 / stmts 73.69 / branches 66.31 /
      // funcs 69.64)。実質的な基準引き上げを避けるため v4 実測の直下へ再設定。引き上げは #312。
      thresholds: {
        lines: 73,
        branches: 65,
        functions: 65,
        statements: 72,
      },
    },
  },
});
