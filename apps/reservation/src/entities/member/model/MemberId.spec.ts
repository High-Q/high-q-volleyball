import { describe, it, expect } from "vitest";
import { createMemberId } from "./MemberId";

describe("createMemberId", () => {
  it("空文字でエラー", () => {
    expect(() => createMemberId("")).toThrow(/MemberId/);
  });

  it("非 UUID 形式でエラー", () => {
    expect(() => createMemberId("not-a-uuid")).toThrow(/MemberId/);
    expect(() => createMemberId("12345")).toThrow(/MemberId/);
  });

  it("正常な UUID v4 で MemberId を返す", () => {
    const uuid = "f47ac10b-58cc-4372-a567-0e02b2c3d479";
    const result = createMemberId(uuid);
    expect(result).toBe(uuid);
  });

  it("正常な UUID（小文字）で MemberId を返す", () => {
    const uuid = "00000000-0000-0000-0000-000000000001";
    expect(() => createMemberId(uuid)).not.toThrow();
  });
});
