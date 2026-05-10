// 6 桁認証コードの生成・ハッシュ化ユーティリティ
//
// - 生成は暗号論的乱数（Web Crypto getRandomValues）を使用し、000000〜999999 を均等に出す
// - DB に保管するのは SHA-256 ハッシュのみ。原文は DB に置かない（design.md D3）

export function generateSixDigitCode(): string {
  // 0〜999999 の整数を均等に取り出す。32bit unsigned から 1_000_000 で剰余を取ると
  // バイアスが乗るが、6 桁コードは brute force 耐性のための長さは試行回数上限で担保する設計のため
  // モジュロバイアスは無視できる（最大バイアス比率 ~0.023%）。
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  const n = buf[0]! % 1_000_000;
  return n.toString().padStart(6, "0");
}

export async function hashCode(code: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(code);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(digest);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifyCode(
  code: string,
  expectedHash: string,
): Promise<boolean> {
  const actual = await hashCode(code);
  // タイミング攻撃対策の定数時間比較
  if (actual.length !== expectedHash.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i++) {
    diff |= actual.charCodeAt(i) ^ expectedHash.charCodeAt(i);
  }
  return diff === 0;
}
