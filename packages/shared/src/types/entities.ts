/**
 * DB エンティティの TypeScript 型定義。
 *
 * SQL Migration (`supabase/migrations/`) のテーブル定義と 1:1 で対応する。
 * 列追加・型変更は SQL と本ファイルを必ずペアで更新すること。
 *
 * 関連: openspec/changes/db-schema-foundation/specs/data-schema/spec.md
 *       docs/04-システム設計/01-DB設計/01-論理設計/論理設計.md
 */

import type {
  EventId,
  MemberId,
  ReservationId,
  VenueId,
  IdentityDocumentId,
} from "./ids.js";

// =============================================================================
// 列挙値
// =============================================================================

/** イベントの実施ステータス。visibility とは独立。 */
export type EventStatus = "scheduled" | "cancelled" | "closed";

/** イベントの公開ステータス。LP / 予約サイトでの表示制御に使う。 */
export type EventVisibility = "draft" | "published" | "private";

export type MemberRole = "member" | "admin";

/** 経験レベル。当日のチーム分け運用と初心者向けイベント案内に使う。 */
export type ExperienceLevel = "beginner" | "intermediate" | "experienced";

/** 予約ステータス。waitlist は #154 (キャンセル待ち管理 MVP2) で利用予定。 */
export type ReservationStatus =
  | "reserved"
  | "cancelled"
  | "attended"
  | "no_show"
  | "waitlist";

/**
 * 本人確認書類の種別。法的に有効な 10 種類。
 * - my_number_card_masked は個人番号 12 桁マスク済み画像のみ受付。
 * - 通知カードは本人確認書類として無効のため enum に存在しない。
 */
export type DocumentType =
  | "drivers_license"
  | "driving_history_cert"
  | "residence_certificate"
  | "disability_certificate"
  | "residence_card"
  | "special_permanent_resident_cert"
  | "student_id"
  | "passport"
  | "my_number_card_masked"
  | "health_insurance_cert";

/** 本人確認書類の審査ステータス。 */
export type IdentityDocumentStatus = "pending" | "approved" | "rejected";

// =============================================================================
// venues
// =============================================================================

export type Venue = {
  id: VenueId;
  name: string;
  address: string | null;
  /** 標準参加費 (円)。NULL は会場側で都度決定の意味。 */
  default_fee: number | null;
  access_note: string | null;
  /** Google Maps 等のリンク URL。MVP1 は NULL で投入。 */
  map_url: string | null;
  /** メイン会場フラグ。最大 1 件 (partial unique index で担保)。 */
  is_primary: boolean;
  created_at: string;
  updated_at: string;
};

export type VenueInsert = {
  name: string;
  address?: string | null;
  default_fee?: number | null;
  access_note?: string | null;
  map_url?: string | null;
  is_primary?: boolean;
};

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
  /** 会場マスタへの FK。NOT NULL — 必ず venues から選択する。 */
  venue_id: VenueId;
  /** 参加費 (円)。NULL は venues.default_fee を継承する想定 (アプリ層で解決)。 */
  fee: number | null;
  /** smallint。NULL は無制限を意味する。 */
  capacity: number | null;
  visibility: EventVisibility;
  status: EventStatus;
  /** キャンセル期限 (任意)。NULL はキャンセル期限なし。 */
  cancel_deadline: string | null;
  /** auth.users.id への FK（NULL 許可: 作成者削除時に SET NULL）。 */
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * INSERT 時に必要な列のみを抽出した型。
 * `id` / `created_at` / `updated_at` / `status` / `visibility` は DB デフォルト値が
 * 入るため省略可能。`venue_id` / `name` / `start_at` / `end_at` は必須。
 */
export type EventInsert = {
  name: string;
  start_at: string;
  end_at: string;
  venue_id: VenueId;
  description?: string | null;
  fee?: number | null;
  capacity?: number | null;
  visibility?: EventVisibility;
  status?: EventStatus;
  cancel_deadline?: string | null;
  created_by?: string | null;
};

/**
 * admin-events-crud-screen (#86) の UPDATE 用型。本 capability では admin が
 * 編集できる列を `name` / `start_at` / `end_at` / `venue_id` / `fee` のみに
 * 限定する（即時公開ポリシー / MVP1 スコープ縮小のため）。
 *
 * 意図的に除外している列:
 * - `visibility`: D3「即時公開ポリシー」。Edit で勝手に値が変わらないよう
 *    UPDATE ペイロードに含めず、既存値を保護する。
 * - `capacity`: MVP1 で UI に出さない（無制限運用）。NULL 維持のため UPDATE
 *    対象から除外。
 * - `description`: MVP1 で UI に出さない（紹介文セクション削除）。NULL 維持。
 * - `cancel_deadline`: MVP1 で UI に出さない。NULL 維持。
 * - `status`: 中止 / 終了の操作は別 Issue。
 *
 * MVP2 で対応 UI が復活した時点で、本型を拡張する。
 */
export type EventUpdate = {
  name?: string;
  start_at?: string;
  end_at?: string;
  venue_id?: VenueId;
  fee?: number | null;
};

// =============================================================================
// members
// =============================================================================

export type Member = {
  /** auth.users.id と同一値（PK 兼 FK）。 */
  id: MemberId;
  email: string;
  display_name: string;
  /** 生年月日 (ISO 8601 date)。NOT NULL だが、サインアップ直後は placeholder
   * (current_date) が入る。登録フォーム送信時に正式値で UPDATE する。 */
  birthday: string;
  /** 当日連絡用電話番号。任意。 */
  phone: string | null;
  experience_level: ExperienceLevel;
  role: MemberRole;
  /** 拡張属性。空オブジェクトが既定値。 */
  profile: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

/**
 * UPDATE で会員自身が変更可能な列のみを抽出した型。
 * `role` は RLS で会員の自己昇格が禁止されているため UPDATE 対象から除外。
 * `email` も auth.users から同期されるため対象外。
 */
export type MemberSelfUpdate = {
  display_name?: string;
  birthday?: string;
  phone?: string | null;
  experience_level?: ExperienceLevel;
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
  /** 同伴者数 (0〜5)。 */
  guest_count: number;
  /** 予約時点の電話番号スナップショット。member の最新値とは独立。 */
  phone_at_booking: string | null;
  note: string | null;
  /** チェックイン日時。NULL = 未チェックイン。admin のみ更新可。 */
  checked_in_at: string | null;
  /** キャンセル日時。status='cancelled' 遷移時にトリガーで自動設定。 */
  cancelled_at: string | null;
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
  guest_count?: number;
  phone_at_booking?: string | null;
  note?: string | null;
};

// =============================================================================
// identity_documents
// =============================================================================

export type IdentityDocument = {
  id: IdentityDocumentId;
  member_id: MemberId;
  document_type: DocumentType;
  /** 表面画像の Supabase Storage パス。
   * 形式: `<member_id>/<document_id>-front.(jpg|png)`
   * INSERT 時はアプリ層で必須、admin マスク漏れ削除時のみ NULL になる (#171)。 */
  storage_path_front: string | null;
  /** 裏面画像の Supabase Storage パス。任意提出時のみ値を持つ。
   * 形式: `<member_id>/<document_id>-back.(jpg|png)` */
  storage_path_back: string | null;
  status: IdentityDocumentStatus;
  rejection_reason: string | null;
  uploaded_at: string;
  /** 審査日時。NULL = 未確認。 */
  reviewed_at: string | null;
  /** 審査した admin の members.id。NULL は未確認 or 退会で SET NULL。 */
  reviewed_by: MemberId | null;
};

export type IdentityDocumentInsert = {
  member_id: MemberId;
  document_type: DocumentType;
  storage_path_front: string;
  storage_path_back?: string | null;
};

/**
 * admin が承認 / 差し戻しを行う際に更新する列のみ。
 * status は必須、rejection_reason は status='rejected' のとき必須。
 */
export type IdentityDocumentReview = {
  status: IdentityDocumentStatus;
  rejection_reason?: string | null;
  reviewed_at: string;
  reviewed_by: MemberId;
};
