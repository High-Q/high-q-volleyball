import { describe, expect, it } from "vitest";
import { shouldSendByLevel } from "./sample.js";
import type { SentryEvent } from "./types.js";

describe("shouldSendByLevel", () => {
  it("error は常に送出", () => {
    expect(shouldSendByLevel({ level: "error" }, () => 0.99)).toBe(true);
  });

  it("fatal は常に送出", () => {
    expect(shouldSendByLevel({ level: "fatal" }, () => 0.99)).toBe(true);
  });

  it("warning は 0.2 サンプリング", () => {
    const ev: SentryEvent = { level: "warning" };
    expect(shouldSendByLevel(ev, () => 0.19)).toBe(true);
    expect(shouldSendByLevel(ev, () => 0.2)).toBe(false);
    expect(shouldSendByLevel(ev, () => 0.99)).toBe(false);
  });

  it("info は 0.05 サンプリング", () => {
    const ev: SentryEvent = { level: "info" };
    expect(shouldSendByLevel(ev, () => 0.04)).toBe(true);
    expect(shouldSendByLevel(ev, () => 0.05)).toBe(false);
    expect(shouldSendByLevel(ev, () => 0.99)).toBe(false);
  });

  it("debug は常に破棄", () => {
    expect(shouldSendByLevel({ level: "debug" }, () => 0)).toBe(false);
  });

  it("level 未指定はデフォルトで error 扱い", () => {
    expect(shouldSendByLevel({}, () => 0.99)).toBe(true);
  });
});
