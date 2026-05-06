/**
 * `members.id` (UUID) の末尾 4 文字を大文字英数で `ID · XXXX` 形式に整形する。
 *
 * プロフィール画面ヘッダで会員自身の short ID を表示する用途。
 * UUID 標準形式に依存せず、末尾 4 文字を機械的に切り出して大文字化する。
 */
export function formatMemberShortId(memberId: string): string {
  if (memberId.length === 0) {
    return "ID · ----";
  }
  const tail = memberId.slice(-4).toUpperCase();
  return `ID · ${tail}`;
}
