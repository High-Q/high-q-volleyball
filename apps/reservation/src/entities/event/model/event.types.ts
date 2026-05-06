import type { EventId, VenueId } from "@high-q/shared";

export type EventStatus = "scheduled" | "cancelled" | "closed";
export type EventVisibility = "draft" | "published" | "private";

/**
 * `events` テーブル + `venues` join の DB 行（snake_case）。
 * Supabase クエリビルダの `.select("*, venues(...)")` で取得した形に対応。
 */
export type EventRow = {
  id: string;
  name: string;
  start_at: string;
  end_at: string;
  venue_id: string;
  fee: number | null;
  status: EventStatus;
  visibility: EventVisibility;
  venues: {
    name: string;
    meeting_point: string;
    default_fee: number | null;
    map_url: string | null;
  } | null;
};

/**
 * 一覧画面用の Event 型（camelCase）。集合場所は含まず、表示に必要な最小カラムに絞る。
 */
export type EventListItem = {
  id: EventId;
  name: string;
  /** ISO 8601 文字列 */
  startAt: string;
  /** ISO 8601 文字列 */
  endAt: string;
  venueId: VenueId;
  venueName: string;
  /** 円。`events.fee ?? venues.default_fee` のフォールバック適用後の値。NULL は会場側で都度決定 */
  fee: number | null;
};

/**
 * 詳細画面用の Event 型。一覧との差分要素として `meetingPoint` (集合場所) を含む。
 * `mapUrl` は予約完了画面 (#148) で「会場マップを開く」アクションを描画する際に使う。
 */
export type EventDetail = EventListItem & {
  meetingPoint: string;
  mapUrl: string | null;
};
