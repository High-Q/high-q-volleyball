// Plugins
import Components from "unplugin-vue-components/vite";
import Vue from "@vitejs/plugin-vue";
import Vuetify, { transformAssetUrls } from "vite-plugin-vuetify";
// import { VuetifyResolver } from "unplugin-vue-components/resolvers";

// Utilities
import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";
import path from "node:path";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    Vue({
      template: { transformAssetUrls },
    }),
    Vuetify(),
    Components({
    //   resolvers: [VuetifyResolver()],
    }),
  ],
  resolve: {
    alias: {
      "@":         fileURLToPath(new URL("./src",           import.meta.url)),
      "@pages":    fileURLToPath(new URL("./src/pages",     import.meta.url)),
      "@widgets":  fileURLToPath(new URL("./src/widgets",   import.meta.url)),
      "@entities": fileURLToPath(new URL("./src/entities",  import.meta.url)),
      "@shared":   fileURLToPath(new URL("./src/shared",    import.meta.url)),
    },
  },
  // モノレポ root の .env.* を共通参照する（envDir）。
  // 関連: openspec/specs/env-management/spec.md
  envDir: path.resolve(__dirname, "../.."),
});
