import { describe, expect, it } from "vitest";
import {
  AVAILABILITY_FALLBACK,
  formatAvailability,
} from "./format-availability";
import type { EventAvailability } from "../model/event.types";
import { unsafeEventId } from "@high-q/shared";

function make(
  capacity: number | null,
  reservedCount: number,
): EventAvailability {
  return {
    eventId: unsafeEventId("11111111-1111-1111-1111-111111111111"),
    capacity,
    reservedCount,
  };
}

describe("formatAvailability", () => {
  it("capacity NULL → 「N 名 予約中」 (tone=ok, isFull=false)", () => {
    const r = formatAvailability(make(null, 11));
    expect(r.text).toBe("11 名 予約中");
    expect(r.label).toBe("予約状況");
    expect(r.tone).toBe("ok");
    expect(r.isFull).toBe(false);
  });

  it("capacity NULL、予約 0 名 → 「0 名 予約中」 (煽り文言なし)", () => {
    const r = formatAvailability(make(null, 0));
    expect(r.text).toBe("0 名 予約中");
    expect(r.isFull).toBe(false);
  });

  it("capacity あり、残あり (80% 未満) → 「あと N 名 募集」 (tone=ok)", () => {
    const r = formatAvailability(make(18, 11));
    expect(r.text).toBe("あと 7 名 募集");
    expect(r.label).toBe("残り");
    expect(r.tone).toBe("ok");
    expect(r.isFull).toBe(false);
  });

  it("capacity あり、残あり (80% 以上) → tone=warn", () => {
    const r = formatAvailability(make(10, 9));
    expect(r.text).toBe("あと 1 名 募集");
    expect(r.tone).toBe("warn");
    expect(r.isFull).toBe(false);
  });

  it("満員 (booked === capacity) → 「満員」 (tone=full, isFull=true)", () => {
    const r = formatAvailability(make(18, 18));
    expect(r.text).toBe("満員");
    expect(r.tone).toBe("full");
    expect(r.isFull).toBe(true);
  });

  it("万一の overbook (booked > capacity) も「満員」扱い", () => {
    const r = formatAvailability(make(18, 20));
    expect(r.text).toBe("満員");
    expect(r.isFull).toBe(true);
  });

  it("availability=null (取得失敗) → fallback 「—」", () => {
    const r = formatAvailability(null);
    expect(r).toEqual(AVAILABILITY_FALLBACK);
    expect(r.text).toBe("—");
    expect(r.isFull).toBe(false);
  });

  it("「席」という語は使わない", () => {
    const samples: EventAvailability[] = [
      make(null, 11),
      make(18, 11),
      make(18, 18),
      make(10, 9),
    ];
    for (const a of samples) {
      const r = formatAvailability(a);
      expect(r.text).not.toMatch(/席/);
      expect(r.label).not.toMatch(/席/);
    }
  });
});
