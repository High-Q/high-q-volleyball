import { getSupabase } from "@/shared/api/supabase";
import {
  createBirthday,
  createFirstName,
  createLastName,
  createPhone,
  validateOptionalNickname,
  type MemberId,
} from "@/entities/member";
import {
  type CorrectionField,
  type MemberProfile,
  removeCorrectionRequests,
} from "@high-q/shared";

/**
 * 共通ヘルパ: 対象 member の現在の profile を SELECT し、指定 fields の
 * `correction_requests` エントリを除去した次 profile を組み立てる。
 *
 * 呼び出し元は本ヘルパで得た `nextProfile` を UPDATE 文に同時指定することで、
 * field 更新と correction_request の自動消化を 1 トランザクションで行える。
 *
 * 関連: openspec/specs/member-correction-requests/spec.md
 *       (Requirement: 会員による修正完了時の自動消化)
 */
async function buildProfileWithConsumed(
  memberId: MemberId,
  fields: readonly CorrectionField[],
): Promise<MemberProfile> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("members")
    .select("profile")
    .eq("id", memberId as string)
    .maybeSingle();
  if (error !== null) throw error;
  const currentProfile = ((data?.profile ?? {}) as MemberProfile);
  return removeCorrectionRequests(currentProfile, fields);
}

/**
 * 自分の姓・名 (last_name / first_name) を 1 回の UPDATE で同時に更新する。
 *
 * #281: display_name 単体更新は廃止。`last_name` / `first_name` を渡すと、
 * DB トリガ `sync_members_display_name_trg` が `display_name = last_name || ' ' || first_name`
 * を自動同期する。アプリ側から `display_name` を直接書き込む経路は塞いでいる
 * (RLS の WITH CHECK 句で本人 UPDATE は `display_name` 変更を拒否)。
 *
 * #296: 同 mutation で `correction_requests` の `last_name` / `first_name` 両エントリも消化する。
 *
 * Smart constructor `createLastName` / `createFirstName` を経由して空欄/長さを弾く。
 */
export async function updateMyName(
  memberId: MemberId,
  rawLastName: string,
  rawFirstName: string,
): Promise<{ lastName: string; firstName: string }> {
  const lastName = createLastName(rawLastName);
  const firstName = createFirstName(rawFirstName);
  const nextProfile = await buildProfileWithConsumed(memberId, [
    "last_name",
    "first_name",
  ]);
  const supabase = getSupabase();
  const { error } = await supabase
    .from("members")
    .update({ last_name: lastName, first_name: firstName, profile: nextProfile })
    .eq("id", memberId as string);
  if (error !== null) throw error;
  return { lastName, firstName };
}

/**
 * 自分の nickname のみを更新する。
 * 空文字または `null` を渡すと NULL に戻す (validateOptionalNickname の仕様)。
 *
 * #296: `correction_requests` の `nickname` エントリも同時に消化する。
 */
export async function updateMyNickname(
  memberId: MemberId,
  raw: string | null,
): Promise<string | null> {
  const value = validateOptionalNickname(raw);
  const nextProfile = await buildProfileWithConsumed(memberId, ["nickname"]);
  const supabase = getSupabase();
  const { error } = await supabase
    .from("members")
    .update({ nickname: value, profile: nextProfile })
    .eq("id", memberId as string);
  if (error !== null) throw error;
  return value;
}

/**
 * 自分の phone のみを更新する。
 * Smart constructor `createPhone` を経由して携帯番号フォーマットに正規化する。
 *
 * #296: `correction_requests` の `phone` エントリも同時に消化する。
 */
export async function updateMyPhone(
  memberId: MemberId,
  raw: string,
): Promise<string> {
  const value = createPhone(raw);
  const nextProfile = await buildProfileWithConsumed(memberId, ["phone"]);
  const supabase = getSupabase();
  const { error } = await supabase
    .from("members")
    .update({ phone: value, profile: nextProfile })
    .eq("id", memberId as string);
  if (error !== null) throw error;
  return value;
}

/**
 * 自分の Auth メールアドレスを変更する。
 *
 * - `supabase.auth.updateUser({ email })` を呼ぶ
 * - Supabase が新メールに確認リンクを送信する
 * - `members.email` は確認完了後に既存の auth.users -> members 同期トリガーで反映される
 *   (本関数では members を直接更新しない)
 *
 * 注: #296 自動消化は対象外。email はこの mutation 経路では members を更新せず、
 * Supabase 確認完了が成功条件のため、correction_requests の email 消化は別途扱う。
 */
export async function requestMyEmailChange(newEmail: string): Promise<void> {
  if (newEmail.trim().length === 0) {
    throw new Error("メールアドレスを入力してください");
  }
  if (!/.+@.+\..+/.test(newEmail)) {
    throw new Error("メールアドレスの形式が正しくありません");
  }
  const supabase = getSupabase();
  const { error } = await supabase.auth.updateUser({ email: newEmail });
  if (error !== null) {
    if (
      error.message?.toLowerCase().includes("rate limit") === true ||
      (error as unknown as { code?: string }).code ===
        "over_email_send_rate_limit"
    ) {
      throw new Error(
        "送信回数の上限に達しました。約 60 秒お待ちいただいてから再試行してください。",
      );
    }
    throw error;
  }
}

/**
 * 自分の生年月日を更新する。
 *
 * #296 で追加。Smart constructor `createBirthday` を経由して過去日付 + 100 年以内
 * を担保する。`correction_requests` の `birthday` エントリも同時に消化する。
 */
export async function updateMyBirthday(
  memberId: MemberId,
  raw: string,
): Promise<string> {
  const value = createBirthday(raw);
  const nextProfile = await buildProfileWithConsumed(memberId, ["birthday"]);
  const supabase = getSupabase();
  const { error } = await supabase
    .from("members")
    .update({ birthday: value, profile: nextProfile })
    .eq("id", memberId as string);
  if (error !== null) throw error;
  return value;
}
