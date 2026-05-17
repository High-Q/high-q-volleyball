/**
 * URL を fingerprint axis 用の path template に変換する。
 * 個別 ID / メールアドレス / 数値で fingerprint group が爆発しないよう、
 * 動的セグメントを placeholder に置換する。
 *
 * 例:
 *   /api/events/3f2504e0-4f89-11d3-9a0c-0305e82c3301 → /api/events/:id
 *   /users/12345/profile → /users/:n/profile
 *   /lookup?email=foo@bar.com → /lookup
 */

const UUID_REGEX =
  /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const NUMERIC_ID_REGEX = /\/\d+(?=\/|$)/g;
const EMAIL_REGEX = /\/[^/\s?#]+@[^/\s?#]+\.[^/\s?#]+/g;

export function pathTemplate(url: string | undefined): string {
  if (!url) {
    return "";
  }

  let path: string;
  try {
    const u = new URL(url, "http://x");
    path = u.pathname;
  } catch {
    path = url.split("?")[0]?.split("#")[0] ?? url;
  }

  path = path.replace(UUID_REGEX, "/:id");
  path = path.replace(EMAIL_REGEX, "/:email");
  path = path.replace(NUMERIC_ID_REGEX, "/:n");

  return path;
}
