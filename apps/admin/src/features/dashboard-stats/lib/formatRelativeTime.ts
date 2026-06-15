/**
 * Dashboard 用の相対経過時間 formatter (#149)。
 *
 * 境界 (4.3 の仕様):
 *   - < 1 分:   "たった今"
 *   - < 60 分:  "<n> 分前"
 *   - < 24 時間: "<n> 時間前"
 *   - < 7 日:    "<n> 日前" (1 日 = "昨日")
 *   - >= 7 日:   yyyy/MM/dd 形式の絶対表記
 *
 * 関連:
 *   openspec/changes/admin-dashboard-screen/specs/admin-dashboard/spec.md
 */

export function formatRelativeTime(
  iso: string,
  now: Date = new Date(),
): string {
  const then = new Date(iso);
  const diffMs = now.getTime() - then.getTime();
  const minutes = Math.floor(diffMs / (60 * 1000));
  const hours = Math.floor(diffMs / (60 * 60 * 1000));
  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));

  if (minutes < 1) return "たった今";
  if (minutes < 60) return `${minutes} 分前`;
  if (hours < 24) return `${hours} 時間前`;
  if (days === 1) return "昨日";
  if (days < 7) return `${days} 日前`;
  const y = then.getFullYear();
  const m = String(then.getMonth() + 1).padStart(2, "0");
  const d = String(then.getDate()).padStart(2, "0");
  return `${y}/${m}/${d}`;
}
