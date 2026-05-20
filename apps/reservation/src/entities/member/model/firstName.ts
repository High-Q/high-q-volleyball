/**
 * 名 (`members.first_name`) の Smart constructor。
 *
 * #281: 会員登録フォームの氏名入力を姓・名 2 フィールドに分離した際に追加。
 * DB 側の CHECK 制約 (1〜32 文字) と同じ規則をアプリ層でも強制する。
 */
export function createFirstName(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new Error("名を入力してください");
  }
  if (trimmed.length > 32) {
    throw new Error("名は 32 文字以内で入力してください");
  }
  return trimmed;
}
