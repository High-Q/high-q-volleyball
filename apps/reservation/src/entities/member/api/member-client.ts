import { getSupabase } from "@/shared/api/supabase";
import { createMemberId } from "../model/MemberId";
import { createExperienceLevel } from "../model/experienceLevel";
import type {
  Member,
  MemberId,
  MemberProfile,
  MemberRow,
} from "../model/member.types";

function rowToMember(row: MemberRow): Member {
  return {
    id: createMemberId(row.id),
    email: row.email,
    displayName: row.display_name,
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
    .select("*")
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
  displayName: string;
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
      display_name: payload.displayName,
      birthday: payload.birthday,
      phone: payload.phone,
      experience_level: payload.experienceLevel,
      profile: mergedProfile,
    })
    .eq("id", uid)
    .select("*")
    .single();
  if (error) {
    throw error;
  }
  return rowToMember(data as MemberRow);
}
