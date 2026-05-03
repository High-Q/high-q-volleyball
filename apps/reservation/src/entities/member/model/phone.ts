const MOBILE_PATTERN = /^0[789]0\d{8}$/;
const NON_DIGIT = /[^\d+]/g;

function normalizeFullWidthDigits(input: string): string {
  return input.replace(/[０-９]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0xfee0),
  );
}

export function createPhone(value: string): string {
  if (!value || value.trim().length === 0) {
    throw new Error("電話番号を入力してください（当日連絡用）");
  }
  let normalized = normalizeFullWidthDigits(value).trim();
  normalized = normalized.replace(/[\s\-－()（）]/g, "");
  normalized = normalized.replace(NON_DIGIT, "");
  if (normalized.startsWith("+81")) {
    normalized = "0" + normalized.slice(3);
  }
  if (!/^\d+$/.test(normalized)) {
    throw new Error("電話番号は数字で入力してください");
  }
  // 固定電話 / 特殊番号 (0[1-6][0-9]...) は MOBILE_PATTERN を通らないので
  // 桁数より先に prefix を見ることで「携帯番号を入力してください」を正しく出す。
  if (
    normalized.length >= 2 &&
    normalized.startsWith("0") &&
    !["070", "080", "090"].some((p) => normalized.startsWith(p))
  ) {
    throw new Error(
      "携帯電話番号（070 / 080 / 090 で始まる番号）を入力してください",
    );
  }
  if (normalized.length !== 11) {
    throw new Error("電話番号の桁数が正しくありません");
  }
  if (!MOBILE_PATTERN.test(normalized)) {
    throw new Error(
      "携帯電話番号（070 / 080 / 090 で始まる番号）を入力してください",
    );
  }
  return `${normalized.slice(0, 3)}-${normalized.slice(3, 7)}-${normalized.slice(7)}`;
}
