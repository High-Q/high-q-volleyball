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

/**
 * 各書類種別の裏面アップロードに関するヒント (本人確認書類アップロード画面で
 * 裏面スロットの help text として表示)。
 *
 * 書類によって裏面に重要情報があるか / そもそも裏面提出が不要か異なるため、
 * 書類ごとに文言を分岐する SSOT として定義。
 *
 * 関連: openspec/changes/reservation-identity-document-upload/specs/reservation-identity-document-upload/spec.md
 */
export const DOCUMENT_TYPE_BACK_HINTS: Record<DocumentType, string> = {
  drivers_license: "本籍・住所変更履歴がある場合は裏面も提出してください",
  driving_history_cert: "本籍欄に変更がある場合は裏面も提出してください",
  residence_certificate: "見開き 2 ページ目がある場合のみ提出してください",
  disability_certificate:
    "等級・受給者番号が裏面にある場合は提出してください",
  residence_card: "住居地・在留資格の裏面が必須です",
  special_permanent_resident_cert: "住居地・在留情報の裏面が必須です",
  student_id: "有効期限・学年情報が裏面にある場合は提出してください",
  passport: "所持人記入欄 (住所) の見開きページが必須です",
  my_number_card_masked:
    "裏面を提出する場合は個人番号 12 桁を完全にマスクしてください",
  health_insurance_cert: "裏面の提出は通常不要です",
};

/**
 * 各書類種別で「裏面提出が必須」かどうかの SSOT。
 *
 * 本人確認の最低要件 (氏名・現住所・生年月日) を満たすために、表面だけでは
 * 現住所が確認できない書類は裏面も必須とする。
 *
 * - 必須: 在留カード / 特別永住者証明書 (住居地は裏面追記方式)、
 *   パスポート (住所は所持人記入欄)
 * - 任意: その他 7 種 (表面に氏名・住所・生年月日が記載される)
 *
 * 関連: openspec/changes/reservation-identity-document-upload/specs/reservation-identity-document-upload/spec.md
 */
export const DOCUMENT_TYPE_BACK_REQUIRED: Record<DocumentType, boolean> = {
  drivers_license: false,
  driving_history_cert: false,
  residence_certificate: false,
  disability_certificate: false,
  residence_card: true,
  special_permanent_resident_cert: true,
  student_id: false,
  passport: true,
  my_number_card_masked: false,
  health_insurance_cert: false,
};

export const IDENTITY_DOCUMENT_STATUS_LABELS: Record<
  IdentityDocumentStatus,
  string
> = {
  pending: "確認中",
  approved: "承認済み",
  rejected: "差し戻し",
};
