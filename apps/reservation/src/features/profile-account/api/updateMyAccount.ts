import { getSupabase } from "@/shared/api/supabase";
import {
  createDisplayName,
  createPhone,
  validateOptionalNickname,
  type MemberId,
} from "@/entities/member";

/**
 * 自分の display_name のみを更新する。
 * Smart constructor `createDisplayName` を経由して空欄/長さを弾く。
 */
export async function updateMyDisplayName(
  memberId: MemberId,
  raw: string,
): Promise<string> {
  const value = createDisplayName(raw);
  const supabase = getSupabase();
  const { error } = await supabase
    .from("members")
    .update({ display_name: value })
    .eq("id", memberId as string);
  if (error !== null) throw error;
  return value;
}

/**
 * 自分の nickname のみを更新する。
 * 空文字または `null` を渡すと NULL に戻す (validateOptionalNickname の仕様)。
 */
export async function updateMyNickname(
  memberId: MemberId,
  raw: string | null,
): Promise<string | null> {
  const value = validateOptionalNickname(raw);
  const supabase = getSupabase();
  const { error } = await supabase
    .from("members")
    .update({ nickname: value })
    .eq("id", memberId as string);
  if (error !== null) throw error;
  return value;
}

/**
 * 自分の phone のみを更新する。
 * Smart constructor `createPhone` を経由して携帯番号フォーマットに正規化する。
 */
export async function updateMyPhone(
  memberId: MemberId,
  raw: string,
): Promise<string> {
  const value = createPhone(raw);
  const supabase = getSupabase();
  const { error } = await supabase
    .from("members")
    .update({ phone: value })
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
