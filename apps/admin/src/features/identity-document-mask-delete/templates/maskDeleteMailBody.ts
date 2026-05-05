/**
 * マスク漏れ削除メール (再提出依頼) の body / subject テンプレート。
 *
 * 純粋関数として実装。Phase 2 で Resend 化する際にも再利用可能。
 *
 * 関連:
 *   openspec/changes/admin-identity-document-review/specs/admin-identity-document-review/spec.md
 *     (Requirement: 再提出依頼メール / 連鎖予約キャンセル)
 *   openspec/changes/admin-identity-document-review/design.md (D9, D20, D23)
 */

export const MASK_DELETE_MAIL_SUBJECT =
  "[High Q] 本人確認書類の再提出のお願い";

const RESUBMIT_URL = "https://reservation.high-q-volleyball.com/signup/identity";

/**
 * マスク漏れ削除用メール本文を構築する。
 *
 * @param memberName ユーザー display_name
 * @param cancelledCount 連鎖キャンセルされた予約件数 (0 なら言及を省略)
 */
export function buildMaskDeleteMailBody(
  memberName: string,
  cancelledCount: number,
): string {
  const cancelLine =
    cancelledCount > 0
      ? `\n\nなお、本人確認の再提出が必要となったため、お持ちの予約 ${cancelledCount} 件をキャンセルさせていただきました。`
      : "";

  return `${memberName} 様

High Q バレーボールサークルです。
ご提出いただいたマイナンバーカード画像について、個人番号 (裏面 12 桁) のマスクが不十分だったため、安全のため Storage から完全削除いたしました。${cancelLine}

お手数ですが、個人番号を完全に隠した状態で再撮影し、再度 ${RESUBMIT_URL} からご提出ください。

マスキング方法は再提出画面の「サンプル比較」をご参照ください。

High Q バレーボールサークル`;
}

/**
 * mailto: の href 文字列を構築する (subject / body は URL エンコード済)。
 */
export function buildMaskDeleteMailtoHref(
  memberEmail: string,
  memberName: string,
  cancelledCount: number,
): string {
  const subject = encodeURIComponent(MASK_DELETE_MAIL_SUBJECT);
  const body = encodeURIComponent(
    buildMaskDeleteMailBody(memberName, cancelledCount),
  );
  return `mailto:${memberEmail}?subject=${subject}&body=${body}`;
}
