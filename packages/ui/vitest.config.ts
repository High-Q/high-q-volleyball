import Vue from "@vitejs/plugin-vue";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [Vue()],
  test: {
    globals: false,
    environment: "jsdom",
    include: ["src/**/*.spec.ts", "src/**/*.test.ts"],
    css: false,
  },
});
