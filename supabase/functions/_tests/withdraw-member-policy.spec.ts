import { describe, expect, it } from "vitest";
import {
  evaluateWithdrawAuth,
  validateWithdrawPayload,
} from "../_shared/withdraw-member-policy.ts";

const TARGET = "11111111-2222-3333-4444-555555555555";
const OTHER_UID = "99999999-aaaa-bbbb-cccc-dddddddddddd";

describe("evaluateWithdrawAuth", () => {
  it("本人退会: callerUid === targetMemberId なら ok (reason='self')", () => {
    const r = evaluateWithdrawAuth({
      callerUid: TARGET,
      callerRole: "member",
      targetMemberId: TARGET,
    });
    expect(r).toEqual({ ok: true, reason: "self" });
  });

  it("admin 強制削除: callerRole === 'admin' なら他人でも ok", () => {
    const r = evaluateWithdrawAuth({
      callerUid: OTHER_UID,
      callerRole: "admin",
      targetMemberId: TARGET,
    });
    expect(r).toEqual({ ok: true, reason: "admin" });
  });

  it("第三者 (一般会員が他人を消そうとする) は 403 forbidden", () => {
    const r = evaluateWithdrawAuth({
      callerUid: OTHER_UID,
      callerRole: "member",
      targetMemberId: TARGET,
    });
    expect(r).toEqual({ ok: false, status: 403, reason: "forbidden" });
  });

  it("未認証 (callerUid === null) は 401 unauthenticated", () => {
    const r = evaluateWithdrawAuth({
      callerUid: null,
      callerRole: null,
      targetMemberId: TARGET,
    });
    expect(r).toEqual({ ok: false, status: 401, reason: "unauthenticated" });
  });

  it("callerRole が null (members 未登録) でも本人 uid が一致すれば self 経路", () => {
    // 通常 auth.users に居れば members trigger で行ができるが、レースで間に合わない
    // ケースに備え self 判定が role lookup より先に効くことを担保する。
    const r = evaluateWithdrawAuth({
      callerUid: TARGET,
      callerRole: null,
      targetMemberId: TARGET,
    });
    expect(r).toEqual({ ok: true, reason: "self" });
  });
});

describe("validateWithdrawPayload", () => {
  it("有効な UUID で ok=true", () => {
    const r = validateWithdrawPayload({ target_member_id: TARGET });
    expect(r).toEqual({ ok: true, targetMemberId: TARGET });
  });

  it("target_member_id が無い → invalid-target", () => {
    const r = validateWithdrawPayload({});
    expect(r).toEqual({ ok: false, error: "invalid-target" });
  });

  it("UUID 形式でない文字列 → invalid-target", () => {
    const r = validateWithdrawPayload({ target_member_id: "not-a-uuid" });
    expect(r).toEqual({ ok: false, error: "invalid-target" });
  });

  it("オブジェクトでない (null / string / number) → invalid-json", () => {
    expect(validateWithdrawPayload(null)).toEqual({
      ok: false,
      error: "invalid-json",
    });
    expect(validateWithdrawPayload("hello")).toEqual({
      ok: false,
      error: "invalid-json",
    });
    expect(validateWithdrawPayload(42)).toEqual({
      ok: false,
      error: "invalid-json",
    });
  });

  it("target_member_id が文字列以外 → invalid-target", () => {
    const r = validateWithdrawPayload({ target_member_id: 12345 });
    expect(r).toEqual({ ok: false, error: "invalid-target" });
  });
});
