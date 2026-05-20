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
  // #281: 姓・名は独立 NOT NULL 属性。display_name は DB トリガで自動同期される
  //       派生表示用属性で、`last_name + ' ' + first_name` と等しい。
  lastName: string;
  firstName: string;
  displayName: string;
  nickname: string | null;
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
  last_name: string;
  first_name: string;
  display_name: string;
  nickname: string | null;
  birthday: string;
  phone: string | null;
  experience_level: string;
  role: string;
  profile: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};
