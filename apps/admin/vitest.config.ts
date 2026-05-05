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
  },
});
