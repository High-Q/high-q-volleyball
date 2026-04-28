/**
 * DB enum 値の UI 表示用日本語ラベル。
 *
 * SQL の enum / CHECK 制約値を変更したら必ずここも更新する。
 * UI 側で `LABELS.documentType[doc.document_type]` のように参照する。
 *
 * 関連: openspec/changes/db-schema-foundation/specs/data-schema/spec.md
 */

import type {
  EventStatus,
  EventVisibility,
  ExperienceLevel,
  MemberRole,
  ReservationStatus,
  DocumentType,
  IdentityDocumentStatus,
} from "./entities.js";

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  scheduled: "開催予定",
  cancelled: "中止",
  closed: "終了",
};

export const EVENT_VISIBILITY_LABELS: Record<EventVisibility, string> = {
  draft: "下書き",
  published: "公開中",
  private: "限定公開",
};

export const MEMBER_ROLE_LABELS: Record<MemberRole, string> = {
  member: "会員",
  admin: "管理者",
};

export const EXPERIENCE_LEVEL_LABELS: Record<ExperienceLevel, string> = {
  beginner: "初めて",
  intermediate: "中級",
  experienced: "経験者",
};

export const RESERVATION_STATUS_LABELS: Record<ReservationStatus, string> = {
  reserved: "予約済み",
  cancelled: "キャンセル",
  attended: "参加済み",
  no_show: "不参加",
  waitlist: "キャンセル待ち",
};

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  drivers_license: "運転免許証",
  driving_history_cert: "運転経歴証明書",
  residence_certificate: "住民票",
  disability_certificate: "身体障害者手帳等",
  residence_card: "在留カード",
  special_permanent_resident_cert: "特別永住者証明書",
  student_id: "学生証",
  passport: "パスポート",
  my_number_card_masked: "マイナンバーカード (個人番号マスク済み)",
  health_insurance_cert: "健康保険資格確認書",
};

/**
 * 各書類種別の受付条件 (UI で書類選択時に表示)。
 * 法令や運用ルール変更時に更新。
 */
export const DOCUMENT_TYPE_REQUIREMENTS: Record<DocumentType, string> = {
  drivers_license: "有効期間内であること",
  driving_history_cert: "交付日の記載があること",
  residence_certificate: "発行から 3 か月以内であること",
  disability_certificate: "交付日の記載があること",
  residence_card: "有効期間内であること",
  special_permanent_resident_cert: "有効期間内であること",
  student_id: "有効期間内であること",
  passport:
    "令和 2 年 2 月 4 日以前に発給申請されたもの (住所記載欄があるもの) のみ可",
  my_number_card_masked:
    "有効期間内であること。個人番号 12 桁を完全にマスクしてから撮影してください。通知カードは不可。",
  health_insurance_cert: "有効期間内であること",
};

export const IDENTITY_DOCUMENT_STATUS_LABELS: Record<
  IdentityDocumentStatus,
  string
> = {
  pending: "確認中",
  approved: "承認済み",
  rejected: "差し戻し",
};
