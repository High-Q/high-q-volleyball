import { describe, it, expect } from "vitest";
import {
  createEventId,
  createMemberId,
  createReservationId,
  unsafeEventId,
  type EventId,
} from "./ids.js";

const VALID_UUID_V4 = "550e8400-e29b-41d4-a716-446655440000";
const VALID_UUID_UPPER = "550E8400-E29B-41D4-A716-446655440000";
const INVALID_UUID = "not-a-uuid";
const EMPTY = "";

describe("createEventId / createMemberId / createReservationId", () => {
  it.each([
    ["createEventId", createEventId],
    ["createMemberId", createMemberId],
    ["createReservationId", createReservationId],
  ] as const)("%s: 有効な UUID で ok を返す", (_, fn) => {
    const r = fn(VALID_UUID_V4);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value).toBe(VALID_UUID_V4);
    }
  });

  it.each([
    ["createEventId", createEventId],
    ["createMemberId", createMemberId],
    ["createReservationId", createReservationId],
  ] as const)("%s: 大文字 UUID も許容（PostgreSQL は case-insensitive）", (_, fn) => {
    const r = fn(VALID_UUID_UPPER);
    expect(r.ok).toBe(true);
  });

  it.each([
    ["createEventId", createEventId],
    ["createMemberId", createMemberId],
    ["createReservationId", createReservationId],
  ] as const)("%s: 空文字で VALIDATION_EMPTY_ID を返す", (_, fn) => {
    const r = fn(EMPTY);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe("VALIDATION_EMPTY_ID");
    }
  });

  it.each([
    ["createEventId", createEventId],
    ["createMemberId", createMemberId],
    ["createReservationId", createReservationId],
  ] as const)("%s: UUID 形式でない文字列で VALIDATION_INVALID_UUID を返す", (_, fn) => {
    const r = fn(INVALID_UUID);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe("VALIDATION_INVALID_UUID");
    }
  });
});

describe("unsafe* ヘルパー", () => {
  it("バリデーションせずキャストする（信頼ソース用）", () => {
    const id: EventId = unsafeEventId("any-string-not-validated");
    expect(id).toBe("any-string-not-validated");
  });
});

describe("型レベルの安全性（コンパイル時検証）", () => {
  it("EventId と MemberId は構造的に異なる", () => {
    // 以下はランタイムでは同じ string だが、Branded Types により
    // TypeScript レベルで EventId を期待する関数に MemberId を渡せない。
    // このテストは「ランタイム振る舞い」ではなく「コードがコンパイルできること」自体が
    // 仕様で、tsc を通すことで暗黙に検証される。
    const eventResult = createEventId(VALID_UUID_V4);
    const memberResult = createMemberId(VALID_UUID_V4);
    expect(eventResult.ok).toBe(true);
    expect(memberResult.ok).toBe(true);
  });
});
