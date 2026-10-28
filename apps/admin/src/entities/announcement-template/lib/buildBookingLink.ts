import type { EventId } from "@high-q/shared";
import { reservationBaseUrl } from "@/shared/config/reservation";

/**
 * LINE 告知に貼る予約直行リンクを生成する (#386)。
 *
 * - `book=1`: 予約サイトのイベント詳細で予約シートを自動オープン（受付可能時のみ）
 * - `openExternalBrowser=1`: LINE アプリ内でタップされた際、端末の標準ブラウザで開かせる
 *   LINE 公式のリンクパラメータ。ログイン状態が残る標準ブラウザで開くことで再ログインを避ける
 *
 * spec: openspec/changes/line-announcement-copy/specs/admin-line-announcement/spec.md
 *   「告知用予約リンク」
 */
export function buildBookingLink(eventId: EventId, baseUrl?: string): string {
  const base = reservationBaseUrl(baseUrl);
  const id = encodeURIComponent(eventId as unknown as string);
  return `${base}/events/${id}?book=1&openExternalBrowser=1`;
}
