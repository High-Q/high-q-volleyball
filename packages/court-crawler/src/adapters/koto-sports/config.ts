/**
 * 江東区スポーツネットの施設固有定数（spike 1.5 で確定）。
 * 照会手順（driver）とパース（parse）が参照する。
 */

/** サイトの入口 URL。通知の予約 URL もこれを使う（枠署名には含めない）。 */
export const KOTO_BASE_URL = "https://yoyaku.koto-sports.net/";

/** 種目セレクト `riyosmk` の値（2 = バレーボール）。 */
export const RIYOSMK_VOLLEYBALL = "2";

/** 分類セレクト `g_bunruicd_1_show` の値（1 = 体育館系）。 */
export const BUNRUI_TAIIKU = "1";

/**
 * 監視対象の 6 施設（各「大体育室 半面」）。全選択で全施設を検索し、
 * 会場名で {@link isMonitoredVenue} により大体育室・半面に絞り込む。
 * 参照・突き合わせ用に施設名を保持する。
 */
export const KOTO_TARGET_FACILITIES = [
  "スポーツ会館",
  "深川スポーツセンター",
  "亀戸スポーツセンター",
  "有明スポーツセンター",
  "東砂スポーツセンター",
  "深川北スポーツセンター",
] as const;

/**
 * 監視対象の室場か（大体育室「半面」のみ。全面・小体育室は対象外）。
 * 会場名は parse が「施設名 室場名」に正規化した文字列。
 */
export function isMonitoredVenue(venueName: string): boolean {
  return venueName.includes("大体育室") && venueName.includes("半面");
}
