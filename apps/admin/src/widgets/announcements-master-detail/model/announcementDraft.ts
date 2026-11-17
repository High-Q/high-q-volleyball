import {
  endDateToIso,
  isoToEndDate,
  isoToJstDate,
  isoToStartDate,
  startDateToIso,
  type Announcement,
  type AnnouncementAudience,
  type AnnouncementWrite,
} from "@/entities/announcement";

/**
 * お知らせ マスター・ディテール画面の編集ドラフト VM と DB 写像・バリデーション。
 *
 * 掲載期間は「日付のみ」入力（開始は必須・終了は任意＝無期限）。
 * UI 上の `YYYY-MM-DD` を entities/announcement の lib で JST 境界の
 * timestamptz（ISO）に相互変換する。
 *
 * 関連:
 *   openspec/changes/general-announcements/specs/admin-announcements/spec.md
 *   openspec/changes/general-announcements/design.md D4, D5
 */

export const TITLE_MAX = 120;
export const BODY_MAX = 2000;

/** audience 未選択を表す空文字を許す（新規作成は明示選択を必須にする）。 */
export type AudienceChoice = AnnouncementAudience | "";

export interface AnnouncementDraft {
  /** 永続化済みは UUID、未保存の新規は null。 */
  id: string | null;
  title: string;
  body: string;
  audience: AudienceChoice;
  /** 掲載開始日 `YYYY-MM-DD`。 */
  startDate: string;
  /** 掲載終了日 `YYYY-MM-DD`。空文字は無期限。 */
  endDate: string;
  /** updated_at の表示用（読み取り専用、YYYY-MM-DD）。 */
  updated: string;
}

export type AnnouncementDraftErrorKey = "title" | "body" | "audience" | "endDate";
export type ValidationErrors = Partial<Record<AnnouncementDraftErrorKey, string>>;
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationErrors;
}

/** 今日（JST）の `YYYY-MM-DD`。 */
export function todayJst(now: Date = new Date()): string {
  return isoToJstDate(now.toISOString());
}

/** 新規作成時のデフォルト（開始=今日 / 終了=無期限 / audience=未選択）。 */
export function emptyDraft(now: Date = new Date()): AnnouncementDraft {
  return {
    id: null,
    title: "",
    body: "",
    audience: "",
    startDate: todayJst(now),
    endDate: "",
    updated: "",
  };
}

export function announcementToDraft(a: Announcement): AnnouncementDraft {
  return {
    id: a.id as unknown as string,
    title: a.title,
    body: a.body,
    audience: a.audience,
    startDate: isoToStartDate(a.publishStart),
    endDate: isoToEndDate(a.publishEnd),
    updated: isoToJstDate(a.updatedAt),
  };
}

export function draftToWrite(draft: AnnouncementDraft): AnnouncementWrite {
  return {
    title: draft.title.trim(),
    body: draft.body.trim(),
    // validateDraft を通った後は audience は空でない
    audience: draft.audience as AnnouncementAudience,
    publishStart: startDateToIso(draft.startDate),
    publishEnd: endDateToIso(draft.endDate),
  };
}

export function validateDraft(draft: AnnouncementDraft): ValidationResult {
  const errors: ValidationErrors = {};

  const title = draft.title.trim();
  if (title.length === 0) {
    errors.title = "タイトルを入力してください";
  } else if (title.length > TITLE_MAX) {
    errors.title = `タイトルは ${TITLE_MAX} 文字以内で入力してください`;
  }

  const body = draft.body.trim();
  if (body.length === 0) {
    errors.body = "本文を入力してください";
  } else if (body.length > BODY_MAX) {
    errors.body = `本文は ${BODY_MAX} 文字以内で入力してください`;
  }

  if (draft.audience === "") {
    errors.audience = "出す相手を選択してください";
  }

  // 終了日は任意。設定する場合は開始日以降（排他的上限は変換側で翌日にする）。
  if (draft.endDate !== "" && draft.startDate !== "" && draft.endDate < draft.startDate) {
    errors.endDate = "掲載終了日は掲載開始日以降にしてください";
  }

  return { isValid: Object.keys(errors).length === 0, errors };
}
