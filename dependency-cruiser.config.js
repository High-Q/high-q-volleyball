/**
 * dependency-cruiser config.
 *
 * FSD レイヤー方向制約 (app -> pages -> widgets -> features -> entities -> shared) を
 * ESLint と二重で強制する。ESLint 側 (eslint-plugin-boundaries) を主とし、本 config は
 * CI 側のセーフティネット (eslint-disable コメント等で ESLint を回避された場合の補完)。
 *
 * 対象: apps/admin/src, apps/reservation/src
 * 対象外: apps/lp (#310 完了まで), packages/* (FSD 適用外)
 */
module.exports = {
  options: {
    doNotFollow: {
      path: "node_modules",
    },
    exclude: {
      path: [
        "node_modules",
        "dist",
        "coverage",
        // .spec / .test / test fixtures
        "\\.spec\\.(ts|tsx)$",
        "\\.test\\.(ts|tsx)$",
        "/test/",
        // type-only entry points
        "\\.d\\.ts$",
        // LP は #310 完了まで対象外
        "apps/lp",
      ],
    },
    enhancedResolveOptions: {
      extensions: [".ts", ".tsx", ".vue", ".js", ".jsx"],
    },
    reporterOptions: {
      text: { highlightFocused: true },
    },
  },
  forbidden: [
    // ===== FSD レイヤー方向違反: 下位レイヤーから上位への import 禁止 =====
    {
      name: "no-pages-to-app",
      severity: "error",
      from: { path: "apps/(admin|reservation)/src/pages" },
      to: { path: "apps/(admin|reservation)/src/app" },
    },
    {
      name: "no-widgets-to-pages-or-app",
      severity: "error",
      from: { path: "apps/(admin|reservation)/src/widgets" },
      to: { path: "apps/(admin|reservation)/src/(app|pages)" },
    },
    {
      name: "no-features-to-upper",
      severity: "error",
      from: { path: "apps/(admin|reservation)/src/features" },
      to: { path: "apps/(admin|reservation)/src/(app|pages|widgets)" },
    },
    {
      name: "no-entities-to-upper",
      severity: "error",
      from: { path: "apps/(admin|reservation)/src/entities" },
      to: { path: "apps/(admin|reservation)/src/(app|pages|widgets|features)" },
    },
    {
      name: "no-shared-to-upper",
      severity: "error",
      from: { path: "apps/(admin|reservation)/src/shared" },
      to: {
        path: "apps/(admin|reservation)/src/(app|pages|widgets|features|entities)",
      },
    },
    // ===== Circular dependency 禁止 =====
    {
      name: "no-circular",
      severity: "error",
      comment: "循環依存は許可しない",
      from: {},
      to: { circular: true },
    },
    // ===== orphan 警告 (test / spec / config / type-only file を除く) =====
    {
      name: "no-orphans",
      severity: "warn",
      comment: "どこからも参照されない file は削除候補",
      from: {
        orphan: true,
        pathNot: [
          "(^|/)\\.[^/]+\\.(js|cjs|mjs|ts|json)$", // dotfiles
          "\\.d\\.ts$",
          // type-only export はランタイム参照されないので depcruise が orphan 判定しがち
          "\\.types\\.ts$",
          "(^|/)types\\.ts$",
          // index.ts は Public API として参照されるが、depcruise が re-export チェーンを
          // 拾えない場合がある
          "(^|/)index\\.ts$",
          "(^|/)tsconfig\\.json$",
          "(^|/)(vite|vitest|tailwind|postcss)\\.config\\.[jt]s$",
          "main\\.(ts|js)$",
          "App\\.vue$",
        ],
      },
      to: {},
    },
  ],
};
