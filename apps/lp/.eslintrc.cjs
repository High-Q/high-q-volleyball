/**
 * LP (apps/lp) 専用 ESLint 設定。
 *
 * LP は Vuetify 残存中 (#310 で剥がし + TS 化予定) のため、本 change で導入する
 * boundaries / no-restricted-imports / no-restricted-syntax / @typescript-eslint
 * 系の rule は適用しない。既存の vue/essential + vuetify/base のみで運用する。
 *
 * #310 完了後に本ファイルを削除し、ルート config の対象に統合する。
 */
module.exports = {
  root: false,
  // ルート config の overrides を打ち消し、LP 専用の最小ルールに戻す
  rules: {
    "boundaries/element-types": "off",
    "boundaries/no-private": "off",
    "no-restricted-imports": "off",
    "no-restricted-syntax": "off",
  },
};
