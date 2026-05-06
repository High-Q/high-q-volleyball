/**
 * LP に集約されている法令文書ページの URL.
 *
 * 開発時は `VITE_LP_ORIGIN` (例: http://localhost:5173) を設定すると
 * ローカル LP に向けられる. 未設定時は本番 LP を指す.
 */
const lpOrigin =
  (import.meta.env["VITE_LP_ORIGIN"] as string | undefined) ??
  "https://high-q-volleyball.onrender.com";

const normalizedLpOrigin = lpOrigin.replace(/\/$/, "");

export const EXTERNAL_TRANSMISSION_URL = `${normalizedLpOrigin}/external-transmission`;
export const PRIVACY_POLICY_URL = `${normalizedLpOrigin}/privacy`;
