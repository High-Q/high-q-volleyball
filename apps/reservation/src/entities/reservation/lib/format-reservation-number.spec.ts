import { describe, expect, it } from "vitest";
import { unsafeReservationId } from "@high-q/shared";
import { formatReservationNumber } from "./format-reservation-number";

describe("formatReservationNumber", () => {
  it("returns the same output for the same id (deterministic)", () => {
    const id = unsafeReservationId("0a1b2c3d-4e5f-6789-abcd-ef0123456789");
    const a = formatReservationNumber(id);
    const b = formatReservationNumber(id);
    expect(a).toBe(b);
  });

  it("returns the #HQ-XXXX-XXXX format", () => {
    const id = unsafeReservationId("0a1b2c3d-4e5f-6789-abcd-ef0123456789");
    expect(formatReservationNumber(id)).toMatch(/^#HQ-[0-9A-Z]{4}-[0-9A-Z]{4}$/);
  });

  it("excludes Crockford-disallowed letters (I, L, O, U)", () => {
    // 多数の UUID を投入して I/L/O/U が含まれないことを保証する
    for (let n = 0; n < 200; n++) {
      const id = unsafeReservationId(generatePseudoUuid(n));
      const formatted = formatReservationNumber(id);
      expect(formatted).not.toMatch(/[ILOU]/);
    }
  });

  it("does not collide for 1000 distinct UUIDs", () => {
    const seen = new Set<string>();
    for (let n = 0; n < 1000; n++) {
      const id = unsafeReservationId(generatePseudoUuid(n));
      seen.add(formatReservationNumber(id));
    }
    // 32^8 通りの空間に対して 1000 件投入しても重複は実用上ゼロのはず
    expect(seen.size).toBe(1000);
  });

  it("handles UUIDs without hyphens identically to hyphenated form", () => {
    const hyphenated = unsafeReservationId(
      "0a1b2c3d-4e5f-6789-abcd-ef0123456789",
    );
    const flat = unsafeReservationId("0a1b2c3d4e5f6789abcdef0123456789");
    expect(formatReservationNumber(hyphenated)).toBe(
      formatReservationNumber(flat),
    );
  });

  it("uses uppercase letters in output", () => {
    const id = unsafeReservationId("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee");
    const formatted = formatReservationNumber(id);
    expect(formatted).toBe(formatted.toUpperCase());
  });
});

/**
 * テスト用の擬似 UUID 生成。各 seed (n) から決定的に異なる hex 32 桁を生成する。
 * 実 UUID 仕様 (version / variant bit) は無視するが、本関数の入力としては問題ない。
 */
function generatePseudoUuid(seed: number): string {
  let x = seed * 2654435761;
  let hex = "";
  for (let i = 0; i < 8; i++) {
    x = (x * 1103515245 + 12345) | 0;
    hex += (x >>> 0).toString(16).padStart(8, "0");
  }
  hex = hex.slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(
    16,
    20,
  )}-${hex.slice(20, 32)}`;
}
