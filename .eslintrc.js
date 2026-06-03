/**
 * High Q monorepo root ESLint config.
 *
 * Strategy:
 * - 各 app の rule セットは overrides で完全分離する（top-level extends は eslint:recommended のみ）
 *   これにより LP の Vuetify ルールが admin/reservation に漏れない、admin/reservation の
 *   TS/FSD ルールが LP に漏れない、というクリーンな分離を実現する。
 * - LP (apps/lp): vue/essential + vuetify/base（既存ルール踏襲）。#310 完了まで本 change の
 *   boundaries / restricted-imports / service_role 検査は対象外。
 * - admin / reservation: vue/vue3-essential + @typescript-eslint + boundaries + restricted-imports
 *   + restricted-syntax で FSD レイヤー境界 / shared/api 集約 / service_role 露出禁止 を強制。
 *
 * stylistic な rule (max-attributes-per-line 等) は本 change の scope 外。formatter 導入は別 Issue。
 */
module.exports = {
  root: true,
  env: {
    node: true,
    browser: true,
    es2022: true,
  },
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
  },
  extends: ["eslint:recommended"],
  rules: {},
  ignorePatterns: [
    "**/dist/**",
    "**/node_modules/**",
    "**/coverage/**",
    "**/*.config.js",
    "**/*.config.ts",
    "**/*.config.cjs",
    "**/*.config.mjs",
    "supabase/.temp/**",
    "scripts/**",
  ],
  overrides: [
    // -------------------------------------------------------------------------
    // LP (apps/lp) : HQ デザインシステム移行後の TS / Vue 3 設定。
    // FSD boundaries / restricted-imports 検査は別 Issue で個別対応する想定で本 change の
    // 対象外（admin / reservation と同じ機械検知を LP にも広げる作業は follow-up）。
    // -------------------------------------------------------------------------
    {
      files: ["apps/lp/**/*.{js,ts,vue}"],
      parser: "vue-eslint-parser",
      parserOptions: {
        parser: "@typescript-eslint/parser",
        ecmaVersion: 2022,
        sourceType: "module",
        extraFileExtensions: [".vue"],
      },
      plugins: ["@typescript-eslint"],
      extends: [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
        "plugin:vue/vue3-essential",
      ],
      rules: {
        "@typescript-eslint/no-explicit-any": "warn",
        "@typescript-eslint/no-unused-vars": [
          "warn",
          { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
        ],
        "vue/multi-word-component-names": "off",
        "no-empty": ["error", { allowEmptyCatch: true }],
      },
    },

    // -------------------------------------------------------------------------
    // admin / reservation : vue3-essential + TS + FSD boundaries + restricted-imports +
    //                       service_role 検査
    // -------------------------------------------------------------------------
    {
      files: [
        "apps/admin/src/**/*.{ts,tsx,vue}",
        "apps/reservation/src/**/*.{ts,tsx,vue}",
      ],
      parser: "vue-eslint-parser",
      parserOptions: {
        parser: "@typescript-eslint/parser",
        ecmaVersion: 2022,
        sourceType: "module",
        extraFileExtensions: [".vue"],
      },
      plugins: ["@typescript-eslint", "boundaries", "import"],
      extends: [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
        "plugin:vue/vue3-essential",
      ],
      settings: {
        "import/resolver": {
          typescript: { alwaysTryTypes: true },
          node: { extensions: [".ts", ".tsx", ".vue", ".js", ".jsx"] },
        },
        "boundaries/elements": [
          { type: "app", pattern: "apps/*/src/app", mode: "folder" },
          { type: "pages", pattern: "apps/*/src/pages/*", mode: "folder" },
          { type: "widgets", pattern: "apps/*/src/widgets/*", mode: "folder" },
          { type: "features", pattern: "apps/*/src/features/*", mode: "folder" },
          { type: "entities", pattern: "apps/*/src/entities/*", mode: "folder" },
          { type: "shared", pattern: "apps/*/src/shared", mode: "folder" },
          { type: "test", pattern: "apps/*/src/test", mode: "folder" },
        ],
        "boundaries/ignore": [
          "apps/*/src/**/*.spec.{ts,tsx}",
          "apps/*/src/main.ts",
          "apps/*/src/App.vue",
          "apps/*/src/env.d.ts",
        ],
      },
      rules: {
        // FSD レイヤー方向制約: 上位 → 下位 の一方向のみ許可
        "boundaries/element-types": [
          "error",
          {
            default: "disallow",
            rules: [
              { from: "app", allow: ["pages", "widgets", "features", "entities", "shared"] },
              { from: "pages", allow: ["widgets", "features", "entities", "shared"] },
              { from: "widgets", allow: ["features", "entities", "shared"] },
              { from: "features", allow: ["entities", "shared"] },
              { from: "entities", allow: ["entities", "shared"] },
              { from: "shared", allow: ["shared"] },
              { from: "test", allow: ["app", "pages", "widgets", "features", "entities", "shared"] },
            ],
          },
        ],
        // cross-slice の private file 直接 import 禁止 (Public API = index.ts 経由のみ)
        "boundaries/no-private": ["error", { allowUncles: false }],

        // Supabase client は shared/api/ のみ (type-only import は許可)
        // 基本 no-restricted-imports は allowTypeImports をサポートしないため、
        // @typescript-eslint 版を使用 (admin/reservation 共に TS 構文のため可)
        "no-restricted-imports": "off",
        "@typescript-eslint/no-restricted-imports": [
          "error",
          {
            patterns: [
              {
                group: ["@supabase/supabase-js"],
                message:
                  "Supabase client は shared/api/ 経由のみ。features / widgets / entities から直接 import 禁止 (type import のみ可)。",
                allowTypeImports: true,
              },
            ],
          },
        ],

        // service_role 露出禁止 (Edge Function のみ許可)
        "no-restricted-syntax": [
          "error",
          {
            selector: "Literal[value=/service_role/i]",
            message:
              "service_role はクライアントアプリで使用禁止。Edge Function (supabase/functions/) でのみ使用可。",
          },
          {
            selector: "TemplateElement[value.raw=/service_role/i]",
            message:
              "service_role はクライアントアプリで使用禁止 (template literal)。",
          },
        ],

        // 既存コードに合わせて TS 系を warning に下げる (本 change で error 一掃の負担を抑制)
        "@typescript-eslint/no-explicit-any": "warn",
        "@typescript-eslint/no-unused-vars": [
          "warn",
          { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
        ],
        "vue/multi-word-component-names": "off",
        "no-empty": ["error", { allowEmptyCatch: true }],
        "no-self-assign": "warn",
      },
    },

    // -------------------------------------------------------------------------
    // shared/api/ : Supabase client の直接 import を許可
    // -------------------------------------------------------------------------
    {
      files: ["apps/*/src/shared/api/**/*.{ts,tsx,vue}"],
      rules: {
        "no-restricted-imports": "off",
        "@typescript-eslint/no-restricted-imports": "off",
      },
    },

    // -------------------------------------------------------------------------
    // shared/ui/ : shadcn-vue primitives は HTML 予約名 (Dialog / Input / Select 等) と
    //             同名でコピーされる慣習があるため vue/no-reserved-component-names を許容
    // -------------------------------------------------------------------------
    {
      files: ["apps/*/src/shared/ui/**/*.{ts,tsx,vue}"],
      rules: {
        "vue/no-reserved-component-names": "off",
      },
    },

    // -------------------------------------------------------------------------
    // テストファイル: boundaries / service_role 検査を緩める (Mock / fixture 用)
    // -------------------------------------------------------------------------
    {
      files: [
        "apps/*/src/**/*.spec.{ts,tsx}",
        "apps/*/src/test/**/*",
        "apps/*/e2e/**/*",
      ],
      rules: {
        "boundaries/element-types": "off",
        "boundaries/no-private": "off",
        "no-restricted-syntax": "off",
        "@typescript-eslint/no-explicit-any": "off",
      },
    },

    // -------------------------------------------------------------------------
    // Supabase Edge Functions : service_role 利用許可
    // -------------------------------------------------------------------------
    {
      files: ["supabase/functions/**/*.{ts,js}"],
      rules: {
        "no-restricted-syntax": "off",
        "no-restricted-imports": "off",
        "@typescript-eslint/no-restricted-imports": "off",
      },
    },
  ],
};
