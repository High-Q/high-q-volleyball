/**
 * widgets/admin-shell — admin 共通レイアウトシェルの Public API。
 *
 * デスクトップ左サイドバー / モバイル AppBar + ドロワーを提供し、認証配下ルートを包む。
 * 本 index 経由でのみ app 層 (App.vue) から参照する (FSD Public API 原則)。
 *
 * 関連:
 *   openspec/changes/admin-mobile-responsive/specs/admin-responsive-shell/spec.md
 */
export { default as AdminShell } from "./ui/AdminShell.vue";
export { ADMIN_NAV_ITEMS, isNavItemActive } from "./model/navItems";
export type { AdminNavItem } from "./model/navItems";
