/**
 * DB エンティティの TypeScript 型定義。
 *
 * SQL Migration (`supabase/migrations/20260426000000_init_high_q.sql`) のテーブル定義
 * と 1:1 で対応する。列追加・型変更は SQL と本ファイルを必ずペアで更新すること。
 *
 * 関連: openspec/changes/supabase-initial-schema/specs/data-schema/spec.md
 *       docs/04-システム設計/01-DB設計/01-論理設計/論理設計.md
 */

import type { EventId, MemberId, ReservationId } from "./ids.js";

// =============================================================================
// 列挙値
// =============================================================================

export type EventStatus = "scheduled" | "cancelled" | "closed";

export type MemberRole = "member" | "admin";

export type ReservationStatus =
  | "reserved"
  | "cancelled"
  | "attended"
  | "no_show";

// =============================================================================
// events
// =============================================================================

export type Event = {
  id: EventId;
  name: string;
  description: string | null;
  /** ISO 8601 文字列（timestamptz）。Date への変換は呼び出し側責任。 */
  start_at: string;
  /** ISO 8601 文字列（timestamptz）。 */
  end_at: string;
  location: string | null;
  /** smallint。NULL は無制限を意味する。 */
  capacity: number | null;
  status: EventStatus;
  /** auth.users.id への FK（NULL 許可: 作成者削除時に SET NULL）。 */
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * INSERT 時に必要な列のみを抽出した型。
 * `id` / `created_at` / `updated_at` / `status` は DB デフォルト値が入るため省略可能。
 */
export type EventInsert = {
  name: string;
  start_at: string;
  end_at: string;
  description?: string | null;
  location?: string | null;
  capacity?: number | null;
  status?: EventStatus;
  created_by?: string | null;
};

// =============================================================================
// members
// =============================================================================

export type Member = {
  /** auth.users.id と同一値（PK 兼 FK）。 */
  id: MemberId;
  email: string;
  display_name: string;
  role: MemberRole;
  /** 拡張属性。Phase 1 では空オブジェクトが既定値。 */
  profile: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

/**
 * UPDATE で会員自身が変更可能な列のみを抽出した型。
 * `role` は RLS で会員の自己昇格が禁止されているため UPDATE 対象から除外。
 */
export type MemberSelfUpdate = {
  display_name?: string;
  profile?: Record<string, unknown>;
};

// =============================================================================
// reservations
// =============================================================================

export type Reservation = {
  id: ReservationId;
  event_id: EventId;
  member_id: MemberId;
  status: ReservationStatus;
  note: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * 会員が予約を作成する際に必要な列のみ。
 * `member_id` は RLS の WITH CHECK で `auth.uid()` と一致が要求される。
 */
export type ReservationInsert = {
  event_id: EventId;
  member_id: MemberId;
  note?: string | null;
};
