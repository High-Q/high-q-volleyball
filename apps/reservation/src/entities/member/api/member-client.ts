import { getSupabase } from "@/shared/api/supabase";
import { createMemberId } from "../model/MemberId";
import { createExperienceLevel } from "../model/experienceLevel";
import type {
  Member,
  MemberId,
  MemberProfile,
  MemberRow,
} from "../model/member.types";

// reservation アプリは admin 専用列 `admin_note` を取得しない (#150)。
// 列指定 SELECT に統一する運用を維持すること (rls-policies capability 参照)。
// #281: last_name / first_name を追加。display_name はトリガ同期される派生値だが
// nickname fallback / 表示用に引き続き SELECT する。
const MEMBER_COLUMNS =
  "id, email, last_name, first_name, display_name, nickname, birthday, phone, experience_level, role, profile, created_at, updated_at";

function rowToMember(row: MemberRow): Member {
  return {
    id: createMemberId(row.id),
    email: row.email,
    lastName: row.last_name,
    firstName: row.first_name,
    displayName: row.display_name,
    nickname: row.nickname,
    birthday: row.birthday,
    phone: row.phone,
    experienceLevel: createExperienceLevel(row.experience_level),
    role: row.role === "admin" ? "admin" : "member",
    profile: (row.profile ?? {}) as MemberProfile,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchMyMember(uid: string): Promise<Member | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("members")
    .select(MEMBER_COLUMNS)
    .eq("id", uid)
    .maybeSingle();
  if (error) {
    throw error;
  }
  if (data === null) {
    return null;
  }
  return rowToMember(data as MemberRow);
}

export type UpdateMemberPayload = {
  // #281: displayName は廃止。lastName / firstName を渡すと DB トリガで display_name が同期される。
  lastName: string;
  firstName: string;
  nickname: string | null;
  birthday: string;
  phone: string;
  experienceLevel: "beginner" | "intermediate" | "experienced";
  termsAgreedAt: string;
};

export async function updateMyMember(
  uid: MemberId | string,
  payload: UpdateMemberPayload,
): Promise<Member> {
  const supabase = getSupabase();
  // 更新前 SELECT で現在の profile を取得し、JS でマージしてから UPDATE
  // (Supabase の update は jsonb 全置換になるため、既存キーを残す)
  const { data: existing, error: fetchError } = await supabase
    .from("members")
    .select("profile")
    .eq("id", uid)
    .maybeSingle();
  if (fetchError) {
    throw fetchError;
  }
  const currentProfile =
    existing !== null && existing !== undefined
      ? ((existing as { profile: Record<string, unknown> | null }).profile ?? {})
      : {};
  const mergedProfile: MemberProfile = {
    ...currentProfile,
    signup_completed: true,
    terms_agreed_at: payload.termsAgreedAt,
  };
  const { data, error } = await supabase
    .from("members")
    .update({
      last_name: payload.lastName,
      first_name: payload.firstName,
      nickname: payload.nickname,
      birthday: payload.birthday,
      phone: payload.phone,
      experience_level: payload.experienceLevel,
      profile: mergedProfile,
    })
    .eq("id", uid)
    .select(MEMBER_COLUMNS)
    .single();
  if (error) {
    throw error;
  }
  return rowToMember(data as MemberRow);
}
