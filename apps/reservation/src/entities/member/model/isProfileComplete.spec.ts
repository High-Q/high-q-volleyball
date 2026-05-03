import { describe, it, expect } from "vitest";
import { isProfileComplete } from "./isProfileComplete";
import type { Member, MemberId } from "./member.types";

const baseMember: Member = {
  id: "00000000-0000-0000-0000-000000000001" as MemberId,
  email: "test@example.com",
  displayName: "test",
  birthday: "1995-03-15",
  phone: "090-1234-5678",
  experienceLevel: "beginner",
  role: "member",
  profile: {},
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

describe("isProfileComplete", () => {
  it("member が null で false", () => {
    expect(isProfileComplete(null)).toBe(false);
  });

  it("profile が空オブジェクトで false", () => {
    expect(isProfileComplete({ ...baseMember, profile: {} })).toBe(false);
  });

  it("signup_completed が false で false", () => {
    expect(
      isProfileComplete({ ...baseMember, profile: { signup_completed: false } }),
    ).toBe(false);
  });

  it("signup_completed が true で true", () => {
    expect(
      isProfileComplete({ ...baseMember, profile: { signup_completed: true } }),
    ).toBe(true);
  });

  it("他キーが含まれていても signup_completed: true なら true", () => {
    expect(
      isProfileComplete({
        ...baseMember,
        profile: { signup_completed: true, terms_agreed_at: "2026-05-02T00:00:00Z" },
      }),
    ).toBe(true);
  });

  it("role === 'admin' なら profile に関係なく true (member 完全上位互換)", () => {
    expect(
      isProfileComplete({ ...baseMember, role: "admin", profile: {} }),
    ).toBe(true);
    expect(
      isProfileComplete({
        ...baseMember,
        role: "admin",
        profile: { signup_completed: false },
      }),
    ).toBe(true);
  });

  it("role === 'member' + signup_completed != true で false", () => {
    expect(
      isProfileComplete({ ...baseMember, role: "member", profile: {} }),
    ).toBe(false);
  });
});
