/**
 * admin-shell のグローバルナビ項目定義。実在ルートのみを列挙する
 * (設定 等の未実装ルートは出さない — admin-responsive-shell spec)。
 *
 * `activePrefix` は現在ルート名の前方一致でアクティブ判定する
 * (例: events 配下の events-new / events-detail / events-edit も「イベント」を点灯)。
 */
export interface AdminNavItem {
  /** vue-router の route name (遷移先) */
  readonly routeName: string;
  readonly label: string;
  /** ShellIcon の name */
  readonly icon: "home" | "calendar" | "users" | "pin" | "document";
  /** 現在ルート名がこの文字列で始まればアクティブ */
  readonly activePrefix: string;
  /** 本人確認書類のみ pending 件数 Badge を表示 */
  readonly pendingBadge?: boolean;
}

export const ADMIN_NAV_ITEMS: ReadonlyArray<AdminNavItem> = [
  {
    routeName: "dashboard",
    label: "ダッシュボード",
    icon: "home",
    activePrefix: "dashboard",
  },
  {
    routeName: "events",
    label: "イベント",
    icon: "calendar",
    activePrefix: "events",
  },
  {
    routeName: "members",
    label: "会員",
    icon: "users",
    activePrefix: "members",
  },
  {
    routeName: "venues",
    label: "会場",
    icon: "pin",
    activePrefix: "venues",
  },
  {
    routeName: "identity-documents",
    label: "本人確認書類",
    icon: "document",
    activePrefix: "identity-document",
    pendingBadge: true,
  },
];

/** 現在ルート名がナビ項目に該当するか (前方一致) */
export function isNavItemActive(
  item: AdminNavItem,
  currentRouteName: string | null | undefined,
): boolean {
  if (currentRouteName == null) return false;
  return currentRouteName.startsWith(item.activePrefix);
}
