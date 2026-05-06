// 許容文字種は migration の CHECK 制約と同一表現を維持する。
// 参照: supabase/migrations/20260507000000_add_members_nickname.sql
//      openspec/changes/reservation-member-nickname/specs/data-schema/spec.md
//
// ひらがな U+3041–U+3096 / カタカナ U+30A1–U+30FA + 長音符 U+30FC /
// CJK 統合漢字基本ブロック U+4E00–U+9FFF / 半角英字 ASCII の和集合。
// 数字・記号・絵文字は許容しない。
const NICKNAME_ALLOWED_PATTERN = /^[ぁ-ゖァ-ヺー一-鿿a-zA-Z]+$/;
const NICKNAME_MAX_LENGTH = 15;

export function createNickname(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new Error("ニックネームを入力してください");
  }
  if (trimmed.length > NICKNAME_MAX_LENGTH) {
    throw new Error(
      `ニックネームは ${NICKNAME_MAX_LENGTH} 文字以内で入力してください`,
    );
  }
  if (!NICKNAME_ALLOWED_PATTERN.test(trimmed)) {
    throw new Error(
      "ニックネームは日本語と英字のみで入力してください（数字・記号・絵文字は使えません）",
    );
  }
  return trimmed;
}

// 任意項目用。空欄は null を返し、値があるときだけ createNickname で検証する。
export function validateOptionalNickname(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (value.trim().length === 0) {
    return null;
  }
  return createNickname(value);
}
