import { getSupabase } from "@/shared/api/supabase";
import {
  createExperienceLevel,
  type ExperienceLevel,
  type MemberId,
} from "@/entities/member";

/**
 * 自分の `members.experience_level` を即時更新する。
 *
 * Smart constructor `createExperienceLevel` を経由して enum 外の値を弾いた上で
 * UPDATE を発行する。RLS により自分の行のみ更新可能。
 */
export async function updateMyExperienceLevel(
  memberId: MemberId,
  rawLevel: string,
): Promise<ExperienceLevel> {
  const level = createExperienceLevel(rawLevel);
  const supabase = getSupabase();
  const { error } = await supabase
    .from("members")
    .update({ experience_level: level })
    .eq("id", memberId as string);
  if (error !== null) {
    throw error;
  }
  return level;
}
