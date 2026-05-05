/**
 * 差し戻しメール (再提出依頼) の body / subject テンプレート。
 *
 * 純粋関数として実装。Phase 2 で Resend 化する際にも再利用可能。
 *
 * 関連:
 *   openspec/changes/admin-identity-document-review/specs/admin-identity-document-review/spec.md
 *     (Requirement: 再提出依頼メール / Requirement: 差し戻し / マスク漏れ削除に伴う連鎖予約キャンセル)
 *   openspec/changes/admin-identity-document-review/design.md (D9, D20, D23)
 */

export const REJECT_MAIL_SUBJECT = "[High Q] 本人確認書類の再提出のお願い";

const RESUBMIT_URL = "https://reservation.high-q-volleyball.com/signup/identity";

/**
 * 差し戻し用メール本文を構築する。
 *
 * @param memberName ユーザー display_name
 * @param reason rejection_reason (admin 入力の差し戻し理由)
 * @param cancelledCount 連鎖キャンセルされた予約件数 (0 なら言及を省略)
 */
export function buildRejectMailBody(
  memberName: string,
  reason: string,
  cancelledCount: number,
): string {
  const cancelLine =
    cancelledCount > 0
      ? `\n\nなお、本人確認の再提出が必要となったため、お持ちの予約 ${cancelledCount} 件をキャンセルさせていただきました。\nお手数ですが書類を再提出いただいたのち、改めて予約をお願いします。`
      : "";

  return `${memberName} 様

High Q バレーボールサークルです。
ご提出いただいた本人確認書類について、以下の理由で再提出をお願いいたします。

差し戻し理由:
${reason}${cancelLine}

恐れ入りますが、再度 ${RESUBMIT_URL} からご提出ください。

ご不明点があればこのメールに返信ください。

High Q バレーボールサークル`;
}

/**
 * mailto: の href 文字列を構築する (subject / body は URL エンコード済)。
 */
export function buildRejectMailtoHref(
  memberEmail: string,
  memberName: string,
  reason: string,
  cancelledCount: number,
): string {
  const subject = encodeURIComponent(REJECT_MAIL_SUBJECT);
  const body = encodeURIComponent(
    buildRejectMailBody(memberName, reason, cancelledCount),
  );
  return `mailto:${memberEmail}?subject=${subject}&body=${body}`;
}
