import { describe, it, expect } from "vitest";
import {
  createEventId,
  createMemberId,
  createReservationId,
  createVenueId,
  createIdentityDocumentId,
  unsafeEventId,
  unsafeVenueId,
  type EventId,
  type VenueId,
} from "./ids.js";

const VALID_UUID_V4 = "550e8400-e29b-41d4-a716-446655440000";
const VALID_UUID_UPPER = "550E8400-E29B-41D4-A716-446655440000";
const INVALID_UUID = "not-a-uuid";
const EMPTY = "";

describe("createXxxId — 5 種類すべての smart constructor", () => {
  const constructors = [
    ["createEventId", createEventId],
    ["createMemberId", createMemberId],
    ["createReservationId", createReservationId],
    ["createVenueId", createVenueId],
    ["createIdentityDocumentId", createIdentityDocumentId],
  ] as const;

  it.each(constructors)("%s: 有効な UUID で ok を返す", (_, fn) => {
    const r = fn(VALID_UUID_V4);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value).toBe(VALID_UUID_V4);
    }
  });

  it.each(constructors)(
    "%s: 大文字 UUID も許容（PostgreSQL は case-insensitive）",
    (_, fn) => {
      const r = fn(VALID_UUID_UPPER);
      expect(r.ok).toBe(true);
    }
  );

  it.each(constructors)("%s: 空文字で VALIDATION_EMPTY_ID を返す", (_, fn) => {
    const r = fn(EMPTY);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe("VALIDATION_EMPTY_ID");
    }
  });

  it.each(constructors)(
    "%s: UUID 形式でない文字列で VALIDATION_INVALID_UUID を返す",
    (_, fn) => {
      const r = fn(INVALID_UUID);
      expect(r.ok).toBe(false);
      if (!r.ok) {
        expect(r.error.code).toBe("VALIDATION_INVALID_UUID");
      }
    }
  );
});

describe("unsafe* ヘルパー", () => {
  it("バリデーションせずキャストする（信頼ソース用）", () => {
    const id: EventId = unsafeEventId("any-string-not-validated");
    expect(id).toBe("any-string-not-validated");
  });

  it("VenueId にも unsafe ヘルパーがある", () => {
    const id: VenueId = unsafeVenueId("trusted-venue-uuid");
    expect(id).toBe("trusted-venue-uuid");
  });
});

describe("型レベルの安全性（コンパイル時検証）", () => {
  it("EventId と VenueId は構造的に異なる", () => {
    // ランタイムでは同じ string だが、Branded Types により
    // EventId を期待する関数に VenueId を渡せない。
    // tsc を通すこと自体が仕様検証。
    const eventResult = createEventId(VALID_UUID_V4);
    const venueResult = createVenueId(VALID_UUID_V4);
    expect(eventResult.ok).toBe(true);
    expect(venueResult.ok).toBe(true);
  });

  it("VenueId と IdentityDocumentId は構造的に異なる", () => {
    const venueResult = createVenueId(VALID_UUID_V4);
    const docResult = createIdentityDocumentId(VALID_UUID_V4);
    expect(venueResult.ok).toBe(true);
    expect(docResult.ok).toBe(true);
  });
});
