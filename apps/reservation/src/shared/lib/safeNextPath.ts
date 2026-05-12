/**
 * `next` クエリパラメータの値を open redirect 攻撃から防ぐために検証し、
 * 信頼可能なパス文字列として正規化または却下する。
 *
 * 受理条件:
 *   - 文字列であること
 *   - `/` で始まる (絶対 URL や protocol-relative URL ではない)
 *   - `//` で始まらない (protocol-relative URL を防ぐ)
 *   - 改行・タブ・制御文字を含まない
 *   - バックスラッシュを含まない (一部ブラウザの URL 解釈差を防ぐ)
 *   - 認証導線 (`/login` / `/signup` / `/signup/...` / `/auth/...`) への循環を防ぐ
 */
const CONTROL_CHAR_PATTERN = /[\x00-\x1f\x7f]/;
const BLOCKED_PREFIXES = [
  "/login",
  "/signup",
  "/auth/",
];

export function safeNextPath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (value.length === 0) return null;
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//")) return null;
  if (value.includes("\\")) return null;
  if (CONTROL_CHAR_PATTERN.test(value)) return null;

  // path 部分のみを取り出して認証導線判定する (query / hash を除く)
  const pathOnly = value.split(/[?#]/, 1)[0] ?? value;
  for (const prefix of BLOCKED_PREFIXES) {
    if (pathOnly === prefix || pathOnly.startsWith(prefix + "/") || pathOnly === prefix) {
      return null;
    }
    // /login や /signup そのもの (末尾なし) も却下対象
    if (pathOnly === prefix) return null;
  }
  // 厳密判定: /login, /signup, /auth は単独でも prefix + "/..." でも却下
  if (
    pathOnly === "/login" ||
    pathOnly === "/signup" ||
    pathOnly.startsWith("/login/") ||
    pathOnly.startsWith("/signup/") ||
    pathOnly.startsWith("/auth/")
  ) {
    return null;
  }

  return value;
}
