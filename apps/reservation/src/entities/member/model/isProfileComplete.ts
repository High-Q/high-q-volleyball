import type { Member } from "./member.types";

/**
 * プロフィール完成判定。
 *
 * 以下のいずれかを満たすとき完成扱い:
 * - profile.signup_completed === true (一般会員が /signup/profile で全項目入力 + 登録)
 * - role === 'admin' (admin は member の完全上位互換 — 翔太郎くん 2026-05-02 指示)
 */
export function isProfileComplete(member: Member | null): boolean {
  if (member === null) return false;
  if (member.role === "admin") return true;
  return member.profile?.signup_completed === true;
}
