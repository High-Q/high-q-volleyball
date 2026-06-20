import { describe, expect, it } from "vitest";
import {
  selectPromotions,
  type WaitlistEntry,
} from "../_shared/waitlist-promotion.ts";

function entry(
  id: string,
  guestCount: number,
  createdAt: string,
): WaitlistEntry {
  return { reservationId: id, memberId: `m-${id}`, guestCount, createdAt };
}

describe("selectPromotions", () => {
  it("capacity NULL → 繰り上げなし (空配列)", () => {
    const r = selectPromotions({
      capacity: null,
      booked: 0,
      waitlist: [entry("a", 0, "2026-06-01T00:00:00Z")],
    });
    expect(r).toEqual([]);
  });

  it("空き 0 (booked >= capacity) → 繰り上げなし", () => {
    const r = selectPromotions({
      capacity: 18,
      booked: 18,
      waitlist: [entry("a", 0, "2026-06-01T00:00:00Z")],
    });
    expect(r).toEqual([]);
  });

  it("空きに収まる最古の待機者を繰り上げる", () => {
    const r = selectPromotions({
      capacity: 18,
      booked: 17,
      waitlist: [
        entry("a", 0, "2026-06-01T00:00:00Z"),
        entry("b", 0, "2026-06-02T00:00:00Z"),
      ],
    });
    expect(r.map((e) => e.reservationId)).toEqual(["a"]);
  });

  it("収まらない先頭はスキップして次を繰り上げる (空きを埋め切る)", () => {
    // available = 1。先頭 b は 2 名必要で入らない → スキップ。次 c は 1 名で入る
    const r = selectPromotions({
      capacity: 18,
      booked: 17,
      waitlist: [
        entry("b", 1, "2026-06-01T00:00:00Z"),
        entry("c", 0, "2026-06-02T00:00:00Z"),
      ],
    });
    expect(r.map((e) => e.reservationId)).toEqual(["c"]);
  });

  it("残り空きに大人数が入らなければスキップして埋め切る", () => {
    // available = 2。[need3, need2, need1] → 3 はスキップ、2 を採用 (available 0)、1 は不採用
    const r = selectPromotions({
      capacity: 18,
      booked: 16,
      waitlist: [
        entry("x", 2, "2026-06-01T00:00:00Z"),
        entry("y", 1, "2026-06-02T00:00:00Z"),
        entry("z", 0, "2026-06-03T00:00:00Z"),
      ],
    });
    expect(r.map((e) => e.reservationId)).toEqual(["y"]);
  });

  it("まとまった空きで複数名を順に繰り上げる", () => {
    // available = 3。[need1, need2] → 両方 (1 + 2 = 3)
    const r = selectPromotions({
      capacity: 18,
      booked: 15,
      waitlist: [
        entry("p", 0, "2026-06-01T00:00:00Z"),
        entry("q", 1, "2026-06-02T00:00:00Z"),
      ],
    });
    expect(r.map((e) => e.reservationId)).toEqual(["p", "q"]);
  });

  it("created_at ASC でない入力でも昇順に評価する (防御的ソート)", () => {
    const r = selectPromotions({
      capacity: 18,
      booked: 17,
      waitlist: [
        entry("late", 0, "2026-06-05T00:00:00Z"),
        entry("early", 0, "2026-06-01T00:00:00Z"),
      ],
    });
    expect(r.map((e) => e.reservationId)).toEqual(["early"]);
  });

  it("待機 0 件 → 空配列", () => {
    const r = selectPromotions({ capacity: 18, booked: 10, waitlist: [] });
    expect(r).toEqual([]);
  });
});
