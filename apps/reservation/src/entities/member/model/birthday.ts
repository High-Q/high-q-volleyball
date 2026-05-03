const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function createBirthday(value: string): string {
  if (!ISO_DATE_PATTERN.test(value)) {
    throw new Error("生年月日の形式が正しくありません");
  }
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    throw new Error("生年月日の形式が正しくありません");
  }
  const now = new Date();
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  if (date.getTime() > today.getTime()) {
    throw new Error("生年月日は過去の日付を入力してください");
  }
  const hundredYearsAgo = new Date(
    Date.UTC(today.getUTCFullYear() - 100, today.getUTCMonth(), today.getUTCDate()),
  );
  if (date.getTime() < hundredYearsAgo.getTime()) {
    throw new Error("生年月日が正しくありません");
  }
  return value;
}
