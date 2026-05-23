import { getSupabase } from "@/shared/api/supabase";
import {
  createExperienceLevel,
  type ExperienceLevel,
  type MemberId,
} from "@/entities/member";
import { type MemberProfile, removeCorrectionRequests } from "@high-q/shared";

/**
 * 自分の `members.experience_level` を即時更新する。
 *
 * Smart constructor `createExperienceLevel` を経由して enum 外の値を弾いた上で
 * UPDATE を発行する。RLS により自分の行のみ更新可能。
 *
 * #296 で追加: 同 mutation 内で `correction_requests` の `experience_level` エントリも
 * 同時に消化する。SELECT profile → JS で filter → UPDATE field + profile を 1 トランザクション。
 */
export async function updateMyExperienceLevel(
  memberId: MemberId,
  rawLevel: string,
): Promise<ExperienceLevel> {
  const level = createExperienceLevel(rawLevel);
  const supabase = getSupabase();

  const { data, error: fetchError } = await supabase
    .from("members")
    .select("profile")
    .eq("id", memberId as string)
    .maybeSingle();
  if (fetchError !== null) throw fetchError;
  const currentProfile = ((data?.profile ?? {}) as MemberProfile);
  const nextProfile = removeCorrectionRequests(currentProfile, [
    "experience_level",
  ]);

  const { error } = await supabase
    .from("members")
    .update({ experience_level: level, profile: nextProfile })
    .eq("id", memberId as string);
  if (error !== null) {
    throw error;
  }
  return level;
}
