export function createDisplayName(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new Error("お名前を入力してください");
  }
  if (trimmed.length > 50) {
    throw new Error("お名前は 50 文字以内で入力してください");
  }
  return trimmed;
}
