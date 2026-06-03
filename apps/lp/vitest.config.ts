import Vue from "@vitejs/plugin-vue";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [Vue()],
  resolve: {
    alias: {
      "@":         fileURLToPath(new URL("./src",           import.meta.url)),
      "@pages":    fileURLToPath(new URL("./src/pages",     import.meta.url)),
      "@widgets":  fileURLToPath(new URL("./src/widgets",   import.meta.url)),
      "@entities": fileURLToPath(new URL("./src/entities",  import.meta.url)),
      "@shared":   fileURLToPath(new URL("./src/shared",    import.meta.url)),
    },
  },
  test: {
    globals: false,
    environment: "jsdom",
    include: ["src/**/*.spec.{ts,tsx,js,jsx}"],
    setupFiles: ["./src/test/setup.ts"],
    css: false,
  },
});
