import path from "node:path";
import { fileURLToPath } from "node:url";
import Vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  // dev: playground を root にして開発サーバーを起動
  if (mode === "development") {
    return {
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
    };
  }

  // build: ライブラリビルド
  return {
    plugins: [Vue()],
    build: {
      lib: {
        entry: path.resolve(__dirname, "src/index.ts"),
        formats: ["es"],
        fileName: () => "index.js",
      },
      rollupOptions: {
        external: ["vue", "@high-q/design-tokens"],
      },
      sourcemap: true,
    },
  };
});
