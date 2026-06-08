import type { EventId, MemberId, VenueId } from "@high-q/shared";

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
 * 予約埋まり具合の集計値 (Issue #277)。
 * `event_availability_view` (SECURITY DEFINER) から取得する aggregate-only DTO。
 * 個人情報は含まない。
 */
export type EventAvailability = {
  eventId: EventId;
  /** events.capacity。NULL は無制限 (MVP1 既定) */
  capacity: number | null;
  /** 本人 + 同伴の人数ベース集計。status IN ('reserved', 'attended') を母集団とする */
  reservedCount: number;
};

/**
 * 一覧画面用の Event 型（camelCase）。集合場所は含まず、表示に必要な最小カラムに絞る。
 * `availability` は別クエリで取得して merge される。取得失敗時は null になり、UI 側で fallback。
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
  /** 予約埋まり具合 (Issue #277)。取得失敗時は null */
  availability: EventAvailability | null;
};

/**
 * 詳細画面用の Event 型。一覧との差分要素として `meetingPoint` (集合場所) を含む。
 * `mapUrl` は予約完了画面 (#148) で「会場マップを開く」アクションを描画する際に使う。
 */
export type EventDetail = EventListItem & {
  meetingPoint: string;
  mapUrl: string | null;
};

/**
 * 予約済イベントの参加者 1 名分 (Issue #278)。
 * `public.get_event_participant_nicknames(p_event_id uuid)` RPC の戻り値 1 行に対応。
 * 本名 / メール / 電話番号 / 生年月日 / 経験レベル等の個人特定情報は含まない。
 */
export type EventParticipantNickname = {
  memberId: MemberId;
  /** members.nickname。未設定者は null。UI 側でマスク表記を組み立てる */
  nickname: string | null;
  /** 自分の予約に対応する行で true */
  isSelf: boolean;
  /** その予約に紐付く同伴者数 (0〜5)。UI 側で末尾サマリ集計に使う */
  guestCount: number;
};
