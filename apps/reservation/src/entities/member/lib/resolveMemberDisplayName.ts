import type { Member } from "../model/member.types";

/**
 * 会員視点画面で表示する名前を「ニックネーム > 氏名」優先で解決する。
 *
 * reservation-member-auth spec「会員視点表示の名前優先ルール」の正準実装。
 * `nickname` が NULL/空文字の場合は `display_name` にフォールバックする。
 */
export function resolveMemberDisplayName(
  member: Pick<Member, "displayName" | "nickname">,
): string {
  if (member.nickname !== null && member.nickname.length > 0) {
    return member.nickname;
  }
  return member.displayName;
}
