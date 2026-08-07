/**
 * crawl コアが扱うドメイン型（施設非依存）。
 * 施設固有アダプタは「対象日リスト → AvailabilitySlot[]」を返す純粋関数に寄せる。
 */

/** 検知した（または通知済みの）空き枠 1 件。DB `court_availability_notifications` と対応。 */
export interface AvailabilitySlot {
  /** 施設アダプタ識別子（例: "koto-sports"）。 */
  facility: string;
  /** 会場・体育室名（例: "スポーツ会館 大体育室 半面"）。 */
  venueName: string;
  /** 枠の日付。`YYYY-MM-DD`（JST の暦日）。 */
  slotDate: string;
  /** 枠の開始時刻。ISO8601（タイムゾーンオフセット付き）。 */
  startAt: string;
  /** 枠の終了時刻。ISO8601（タイムゾーンオフセット付き）。 */
  endAt: string;
  /** 予約 URL。枠署名には含めない（同一枠でも URL は変わり得る）。 */
  reserveUrl: string;
}

/**
 * 枠署名を構成するキー集合。DB の UNIQUE 制約
 * (facility, venue_name, slot_date, start_at, end_at) と一致させる。
 */
export type SlotSignatureKey = Pick<
  AvailabilitySlot,
  "facility" | "venueName" | "slotDate" | "startAt" | "endAt"
>;
