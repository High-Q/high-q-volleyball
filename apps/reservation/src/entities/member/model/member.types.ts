declare const memberIdBrand: unique symbol;

export type MemberId = string & { readonly [memberIdBrand]: "MemberId" };

export type ExperienceLevel = "beginner" | "intermediate" | "experienced";

export type MemberRole = "member" | "admin";

export type MemberProfile = {
  signup_completed?: boolean;
  terms_agreed_at?: string;
  [key: string]: unknown;
};

export type Member = {
  id: MemberId;
  email: string;
  displayName: string;
  birthday: string;
  phone: string | null;
  experienceLevel: ExperienceLevel;
  role: MemberRole;
  profile: MemberProfile;
  createdAt: string;
  updatedAt: string;
};

export type MemberRow = {
  id: string;
  email: string;
  display_name: string;
  birthday: string;
  phone: string | null;
  experience_level: string;
  role: string;
  profile: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};
