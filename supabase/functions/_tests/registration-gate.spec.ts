import { describe, expect, it, vi } from "vitest";
import {
  decideRegistrationOpen,
  isRegistrationOpen,
} from "../_shared/registration-gate.ts";

describe("decideRegistrationOpen（純ロジック）", () => {
  it("受付中（true）の行なら open=true", () => {
    expect(decideRegistrationOpen({ member_registration_enabled: true }, null))
      .toEqual({ open: true, readFailed: false });
  });

  it("停止中（false）の行なら open=false", () => {
    expect(decideRegistrationOpen({ member_registration_enabled: false }, null))
      .toEqual({ open: false, readFailed: false });
  });

  it("読取エラーはフェイルクローズ（open=false, readFailed=true）", () => {
    expect(decideRegistrationOpen(null, { message: "boom" }))
      .toEqual({ open: false, readFailed: true });
  });

  it("行が無い（設定未投入）なら既定で受付中 open=true", () => {
    expect(decideRegistrationOpen(null, null))
      .toEqual({ open: true, readFailed: false });
  });
});

describe("isRegistrationOpen（クライアント経由）", () => {
  function clientReturning(result: { data: unknown; error: unknown }) {
    return {
      from: () => ({
        select: () => ({
          limit: () => ({
            maybeSingle: () => Promise.resolve(result),
          }),
        }),
      }),
    } as never;
  }

  it("受付中の行を読めたら open=true", async () => {
    const r = await isRegistrationOpen(
      clientReturning({ data: { member_registration_enabled: true }, error: null }),
    );
    expect(r).toEqual({ open: true, readFailed: false });
  });

  it("停止中の行を読めたら open=false", async () => {
    const r = await isRegistrationOpen(
      clientReturning({ data: { member_registration_enabled: false }, error: null }),
    );
    expect(r).toEqual({ open: false, readFailed: false });
  });

  it("DB error が返ったらフェイルクローズ", async () => {
    const r = await isRegistrationOpen(
      clientReturning({ data: null, error: { message: "db down" } }),
    );
    expect(r).toEqual({ open: false, readFailed: true });
  });

  it("クエリ自体が throw してもフェイルクローズ（握りつぶさない）", async () => {
    const throwingClient = {
      from: () => {
        throw new Error("network");
      },
    } as never;
    const r = await isRegistrationOpen(throwingClient);
    expect(r).toEqual({ open: false, readFailed: true });
  });
});
