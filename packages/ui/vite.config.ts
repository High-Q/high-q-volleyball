import path from "node:path";
import { fileURLToPath } from "node:url";
import Vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// dev 専用 Vite 設定。playground/ を root として showcase ページを起動する。
// build 工程は持たない（src/ を consumer の Vite/vue-tsc が直接コンパイルする運用）。
export default defineConfig({
  plugins: [Vue()],
  root: path.resolve(__dirname, "playground"),
  resolve: {
    alias: {
      "@high-q/ui": path.resolve(__dirname, "src/index.ts"),
    },
  },
  server: {
    port: 5180,
  },
});
