/**
 * High Q monorepo root stylelint config.
 *
 * 主な目的:
 * - admin / reservation の .vue <style> ブロックで HQ デザイントークン (var(--hq-*)) を経ない
 *   生 hex / rgb カラーリテラル使用を warning として可視化
 * - 既存コードに大量に存在する可能性が高いため severity は warning に統一し、本 change で
 *   error 昇格はしない。error 昇格は別 Issue で扱う。
 *
 * LP (apps/lp) は #310 (Vuetify 剥がし) 完了まで対象外。
 */
module.exports = {
  extends: ["stylelint-config-standard", "stylelint-config-recommended-vue"],
  customSyntax: "postcss-html",
  rules: {
    // ===== HQ デザイントークン経ない生カラーリテラル禁止 =====
    "color-no-hex": [true, { severity: "warning" }],
    "color-named": ["never", { severity: "warning" }],

    // ===== 既存コード対応で緩める stylistic rule =====
    "no-empty-source": null,
    "no-descending-specificity": null,
    "selector-class-pattern": null,
    "custom-property-pattern": null,
    "declaration-empty-line-before": null,
    "rule-empty-line-before": null,
    "comment-empty-line-before": null,
    "media-feature-range-notation": null,
    "alpha-value-notation": null,
    "color-function-notation": null,
    "shorthand-property-no-redundant-values": null,
    "declaration-block-no-redundant-longhand-properties": null,
    "value-keyword-case": null,
    "length-zero-no-unit": null,
    "function-name-case": null,
    "no-duplicate-selectors": null,
    "block-no-empty": null,
    "color-function-alias-notation": null,
    "property-no-vendor-prefix": null,
    "no-invalid-position-declaration": null,
    "media-feature-name-no-vendor-prefix": null,
    "value-no-vendor-prefix": null,
    "selector-no-vendor-prefix": null,
    "at-rule-no-vendor-prefix": null,
    "import-notation": null,
    "keyframes-name-pattern": null,
    "at-rule-empty-line-before": null,
    "declaration-block-single-line-max-declarations": null,
    "number-max-precision": null,
    "hue-degree-notation": null,
    "font-family-no-missing-generic-family-keyword": null,
    "font-family-name-quotes": null,
    "no-duplicate-at-import-rules": null,
    "media-feature-name-value-no-unknown": null,
  },
  ignoreFiles: [
    "**/dist/**",
    "**/node_modules/**",
    "**/coverage/**",
    "apps/lp/**", // LP は #310 完了まで対象外
    "packages/**",
  ],
};
