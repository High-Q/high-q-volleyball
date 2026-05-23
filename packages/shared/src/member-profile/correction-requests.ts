/**
 * #296 修正依頼 (`members.profile.correction_requests`) の helper 群。
 *
 * 配列の filter / append / 存在判定を純粋関数として提供する。アプリ層は本 helper
 * を経由して profile を組み立て、`update({ profile })` を発行する SHALL。
 *
 * 関連: openspec/specs/member-correction-requests/spec.md
 */

import type {
  CorrectionField,
  CorrectionRequest,
  MemberProfile,
} from "../types/entities.js";

/**
 * profile から `correction_requests` 配列を取り出す（未定義 → 空配列）。
 */
export function getCorrectionRequests(
  profile: MemberProfile | null | undefined,
): CorrectionRequest[] {
  if (profile === null || profile === undefined) return [];
  const arr = profile.correction_requests;
  return Array.isArray(arr) ? arr : [];
}

/**
 * 指定 fields に該当する correction_requests エントリを除いた新しい profile を返す。
 * 既存の他キーは保持。`correction_requests` が空になった場合はキー自体を削除する。
 */
export function removeCorrectionRequests(
  profile: MemberProfile | null | undefined,
  fields: readonly CorrectionField[],
): MemberProfile {
  const base: MemberProfile = profile === null || profile === undefined ? {} : { ...profile };
  const before = getCorrectionRequests(base);
  if (before.length === 0 || fields.length === 0) {
    return base;
  }
  const fieldSet = new Set<CorrectionField>(fields);
  const after = before.filter((r) => !fieldSet.has(r.field));
  if (after.length === 0) {
    const { correction_requests: _omit, ...rest } = base;
    return rest;
  }
  return { ...base, correction_requests: after };
}

/**
 * profile に新規 correction_request エントリを追加した profile を返す。
 * 同一 field の既存エントリがある場合は **追加せず例外を投げる** (重複は capability 仕様で禁止)。
 */
export function appendCorrectionRequest(
  profile: MemberProfile | null | undefined,
  entry: CorrectionRequest,
): MemberProfile {
  const base: MemberProfile = profile === null || profile === undefined ? {} : { ...profile };
  const before = getCorrectionRequests(base);
  if (before.some((r) => r.field === entry.field)) {
    throw new Error(
      `correction_request for field "${entry.field}" already exists`,
    );
  }
  return { ...base, correction_requests: [...before, entry] };
}

/**
 * 任意 field の未対応エントリの存在判定。
 */
export function hasCorrectionRequest(
  profile: MemberProfile | null | undefined,
  field: CorrectionField,
): boolean {
  return getCorrectionRequests(profile).some((r) => r.field === field);
}

/**
 * UI 表示用の field 日本語ラベル。
 */
export const CORRECTION_FIELD_LABEL: Record<CorrectionField, string> = {
  last_name: "お名前 (姓)",
  first_name: "お名前 (名)",
  birthday: "生年月日",
  phone: "電話番号",
  experience_level: "経験レベル",
  nickname: "ニックネーム",
};
