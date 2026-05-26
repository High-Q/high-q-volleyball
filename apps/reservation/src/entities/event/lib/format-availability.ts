import type { EventAvailability } from "../model/event.types";

export type AvailabilityTone = "ok" | "warn" | "full";

export type AvailabilityDisplay = {
  /** チップ / facts 行に表示するテキスト本体 */
  text: string;
  /** 詳細 facts grid のラベル (一覧チップでは未使用) */
  label: string;
  /** トーン (OK / WARN: 80% 以上 / FULL: 満員) */
  tone: AvailabilityTone;
  /** 満員フラグ (CTA disabled 判定に使用) */
  isFull: boolean;
};

/** availability=null (取得失敗) 時の fallback。チップは「—」を出す */
export const AVAILABILITY_FALLBACK: AvailabilityDisplay = {
  text: "—",
  label: "予約状況",
  tone: "ok",
  isFull: false,
};

/**
 * capacity / reservedCount から会員向け予約埋まり具合の表示要素を生成する。
 *
 * 規則 (openspec/specs/reservation-events-and-booking/spec.md の
 * 「予約埋まり具合の表示」要件に厳密準拠):
 *
 *   - capacity = NULL                 → 「N 名 予約中」     (label: 予約状況)
 *   - capacity あり、booked < capacity → 「あと N 名 募集」  (label: 残り)
 *   - 満員 (booked >= capacity)        → 「満員」            (label: 予約状況)
 *
 * 「席」表記は使用しない (物理席との混同回避)。
 */
export function formatAvailability(
  availability: EventAvailability | null | undefined,
): AvailabilityDisplay {
  if (availability === null || availability === undefined) {
    return AVAILABILITY_FALLBACK;
  }
  const { capacity, reservedCount } = availability;
  if (capacity === null) {
    return {
      text: `${reservedCount} 名 予約中`,
      label: "予約状況",
      tone: "ok",
      isFull: false,
    };
  }
  if (reservedCount >= capacity) {
    return {
      text: "満員",
      label: "予約状況",
      tone: "full",
      isFull: true,
    };
  }
  const remaining = capacity - reservedCount;
  const pct = (reservedCount / capacity) * 100;
  return {
    text: `あと ${remaining} 名 募集`,
    label: "残り",
    tone: pct >= 80 ? "warn" : "ok",
    isFull: false,
  };
}
