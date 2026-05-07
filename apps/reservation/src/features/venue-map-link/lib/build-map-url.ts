/**
 * 会場地図リンクの URL 解決。
 *
 * - `mapUrl` 登録済 → そのまま使用 (admin の会場マスタ運用 #151 で登録される)
 * - 未登録 → Google Maps 検索 URL を生成 (会場名 + 住所 / address NULL なら会場名のみ)
 *
 * 会場名固有のハードコード分岐は禁止 (data-schema spec / reservation-events-and-booking spec の
 * 「アプリ層ハードコード判定の禁止」ルールと整合)。
 *
 * 関連:
 *   openspec/changes/reservation-detail-page/specs/reservation-detail-page/spec.md
 *     Requirement: 会場地図リンク
 */

const GOOGLE_MAPS_SEARCH_BASE = "https://www.google.com/maps/search/?api=1&query=";

export type VenueMapInput = {
  name: string;
  address: string | null;
  mapUrl: string | null;
};

export function buildMapUrl(venue: VenueMapInput): string {
  if (venue.mapUrl !== null && venue.mapUrl.length > 0) {
    return venue.mapUrl;
  }
  const query =
    venue.address !== null && venue.address.length > 0
      ? `${venue.name} ${venue.address}`
      : venue.name;
  return `${GOOGLE_MAPS_SEARCH_BASE}${encodeURIComponent(query)}`;
}
