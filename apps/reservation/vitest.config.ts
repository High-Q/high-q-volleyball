import Vue from "@vitejs/plugin-vue";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [Vue()],
  test: {
    globals: false,
    environment: "jsdom",
    include: ["src/**/*.spec.{ts,tsx,js,jsx}"],
    setupFiles: ["./src/test/setup.ts"],
    css: false,
    server: {
      deps: {
        inline: ["vuetify"],
      },
    },
  },
});
