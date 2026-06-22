import type { EventAvailability } from "../model/event.types";

export type AvailabilityTone = "ok" | "warn" | "full";

export interface AvailabilityDisplay {
  /** バッジに表示するテキスト本体 */
  text: string;
  /** トーン (ok / warn: 80% 以上 / full: 満員) */
  tone: AvailabilityTone;
  /** 満員フラグ (CTA 文言の切替に使用) */
  isFull: boolean;
}

/**
 * capacity / reservedCount から残席表現を生成する。
 *
 * 予約サイト (apps/reservation) の残席表現規則に完全準拠する:
 *   - capacity = NULL                  → 「N 名 予約中」
 *   - capacity あり、booked < capacity → 「あと N 名 募集」(80% 以上で warn)
 *   - 満員 (booked >= capacity)         → 「満員」
 * 「席」表記は使用しない (物理席との混同回避)。
 *
 * 残席集計が取得できなかった (null / undefined) 場合は null を返し、
 * 呼び出し側はバッジを出さない (グレースフル劣化)。
 */
export function formatAvailability(
  availability: EventAvailability | null | undefined,
): AvailabilityDisplay | null {
  if (availability === null || availability === undefined) {
    return null;
  }

  const { capacity, reservedCount } = availability;

  if (capacity === null) {
    return {
      text:   `${reservedCount} 名 予約中`,
      tone:   "ok",
      isFull: false,
    };
  }

  if (reservedCount >= capacity) {
    return {
      text:   "満員",
      tone:   "full",
      isFull: true,
    };
  }

  const remaining = capacity - reservedCount;
  const pct = (reservedCount / capacity) * 100;
  return {
    text:   `あと ${remaining} 名 募集`,
    tone:   pct >= 80 ? "warn" : "ok",
    isFull: false,
  };
}
