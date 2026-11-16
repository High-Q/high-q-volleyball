// =============================================================================
// 新規会員登録 受付可否ゲート（サーバー側・権威判定）
// =============================================================================
// operational_settings.member_registration_enabled を読み、受付可否を返す。
// request-signup / verify-signup の両方の入口で使い、停止中は会員を作らせない。
//
// フェイルクローズ: 読取がエラー / 例外になった場合は「停止中」とみなす。
//   キルスイッチの目的（不在期間に確実に止める）に合わせ、読めない時に
//   開きっぱなしにならないようにする。設計: design.md D3 / D4。
// 行が無い場合（設定未投入）はエラーではないため既定で受付中（true）とみなす
//   （DB 関数 public.registration_open() の coalesce と一致）。
//
// 本モジュールは Deno 固有依存を持たない純 TS として実装し、_tests の
// vitest で単体検証する（Edge Function entry は本ランナー対象外のため）。
// =============================================================================

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

export interface RegistrationGateResult {
  /** 受付中なら true。停止中・読取失敗時は false。 */
  open: boolean;
  /** 設定の読取に失敗し、フェイルクローズで停止扱いにしたか。 */
  readFailed: boolean;
}

interface SettingsRow {
  member_registration_enabled: boolean;
}

/**
 * 設定行と読取エラーから受付可否を判定する純ロジック。
 */
export function decideRegistrationOpen(
  row: SettingsRow | null,
  error: unknown,
): RegistrationGateResult {
  if (error) {
    return { open: false, readFailed: true };
  }
  if (!row) {
    // 設定未投入はエラーではない。既定で受付中。
    return { open: true, readFailed: false };
  }
  return { open: row.member_registration_enabled !== false, readFailed: false };
}

/**
 * service_role クライアントで operational_settings を読み、受付可否を返す。
 * 読取が error / 例外のいずれでもフェイルクローズ（停止扱い）する。
 */
export async function isRegistrationOpen(
  supabase: SupabaseClient,
): Promise<RegistrationGateResult> {
  try {
    const { data, error } = await supabase
      .from("operational_settings")
      .select("member_registration_enabled")
      .limit(1)
      .maybeSingle();
    return decideRegistrationOpen(data as SettingsRow | null, error);
  } catch {
    return { open: false, readFailed: true };
  }
}
