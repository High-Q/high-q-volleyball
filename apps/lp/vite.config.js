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
  // vendor 別 chunk 分割。更新頻度・サイズが大きく異なる依存を 4 グループに分離し、
  // 初期表示の chunk サイズ低減と戻り訪問時のキャッシュ効率を両立する。
  // 関連: openspec/specs/lp-build-optimization/spec.md
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("node_modules/@sentry/")) return "vendor-sentry";
          if (id.includes("node_modules/@supabase/")) return "vendor-supabase";
          if (
            id.includes("node_modules/vuetify/") ||
            id.includes("node_modules/vite-plugin-vuetify/")
          ) {
            return "vendor-vuetify";
          }
          if (
            id.includes("node_modules/vue/") ||
            id.includes("node_modules/@vue/") ||
            id.includes("node_modules/@tanstack/")
          ) {
            return "vendor-vue";
          }
          return undefined;
        },
      },
    },
  },
  // ローカル開発時のポートを 5173 で固定し、reservation (5174) との
  // 衝突を防ぐ。strictPort により空きポートへの自動フォールバックは禁止。
  server: {
    port: 5173,
    strictPort: true,
  },
  // モノレポ root の .env.* を共通参照する（envDir）。
  // 関連: openspec/specs/env-management/spec.md
  envDir: path.resolve(__dirname, "../.."),
});
