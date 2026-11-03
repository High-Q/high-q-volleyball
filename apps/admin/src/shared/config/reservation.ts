/**
 * 予約サイト (apps/reservation) のベース URL。
 *
 * 告知文に差し込む予約リンク (#386) は常に本番の予約サイトを指すのが正しいため、
 * 本番では環境変数を設定せず既定値を使う。ローカル確認時のみ
 * `VITE_RESERVATION_URL=http://localhost:5174` でローカル予約サイトに向けられる。
 *
 * LP の `apps/lp/src/shared/config/reservation.ts` を踏襲。
 */
const FALLBACK_RESERVATION_URL = "https://high-q-reservation.onrender.com";

export function reservationBaseUrl(
  raw: string | undefined = import.meta.env.VITE_RESERVATION_URL,
): string {
  const base = raw && raw.length > 0 ? raw : FALLBACK_RESERVATION_URL;
  return base.replace(/\/+$/, "");
}
