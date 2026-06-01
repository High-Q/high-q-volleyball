import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { unsafeEventId } from "@high-q/shared";
import AvailabilityStrip from "./AvailabilityStrip.vue";
import type { EventAvailability } from "@/entities/event";

const EV_ID = unsafeEventId("11111111-1111-1111-1111-111111111111");

function make(
  capacity: number | null,
  reservedCount: number,
): EventAvailability {
  return { eventId: EV_ID, capacity, reservedCount };
}

describe("AvailabilityStrip", () => {
  describe("variant=dark", () => {
    it("capacity NULL × 9 名 → 「9 名 予約中」 + UNCAPPED モノラベル", () => {
      const w = mount(AvailabilityStrip, {
        props: { availability: make(null, 9), variant: "dark" },
      });
      expect(w.get('[data-testid="availability-strip"]').text()).toContain(
        "9 名 予約中",
      );
      expect(
        w.find('[data-testid="availability-strip-uncapped"]').exists(),
      ).toBe(true);
      expect(
        w.find('[data-testid="availability-strip-bar"]').exists(),
      ).toBe(false);
    });

    it("capacity 18 × 14 → 「あと 4 名 募集」 + bar (warn 78%)", () => {
      const w = mount(AvailabilityStrip, {
        props: { availability: make(18, 14), variant: "dark" },
      });
      expect(w.get('[data-testid="availability-strip"]').text()).toContain(
        "あと 4 名 募集",
      );
      expect(
        w.find('[data-testid="availability-strip-bar"]').exists(),
      ).toBe(true);
    });

    it("満員 (18/18) → 「満員」 + bar (full)", () => {
      const w = mount(AvailabilityStrip, {
        props: { availability: make(18, 18), variant: "dark" },
      });
      expect(w.get('[data-testid="availability-strip"]').text()).toContain(
        "満員",
      );
      const bar = w.get('[data-testid="availability-strip-bar"]');
      expect(bar.html()).toContain("bg-danger-on-dark");
    });

    it("UNCAPPED ラベルは dark variant では 'UNCAPPED' のみ表示", () => {
      const w = mount(AvailabilityStrip, {
        props: { availability: make(null, 9), variant: "dark" },
      });
      const label = w.get('[data-testid="availability-strip-uncapped"]').text();
      expect(label).toBe("UNCAPPED");
      expect(label).not.toContain("定員上限なし");
    });
  });

  describe("variant=light", () => {
    it("capacity NULL × 9 名 → 「9 名 予約中」 + UNCAPPED · 定員上限なし", () => {
      const w = mount(AvailabilityStrip, {
        props: { availability: make(null, 9), variant: "light" },
      });
      expect(w.get('[data-testid="availability-strip"]').text()).toContain(
        "9 名 予約中",
      );
      expect(
        w.get('[data-testid="availability-strip-uncapped"]').text(),
      ).toBe("UNCAPPED · 定員上限なし");
    });

    it("「あなたを含む」は描画されない (capacity NULL でも light でも)", () => {
      const w = mount(AvailabilityStrip, {
        props: { availability: make(null, 9), variant: "light" },
      });
      expect(w.text()).not.toContain("あなた");
    });

    it("満員 → 「満員」 + light bar (full)", () => {
      const w = mount(AvailabilityStrip, {
        props: { availability: make(18, 18), variant: "light" },
      });
      expect(w.get('[data-testid="availability-strip"]').text()).toContain(
        "満員",
      );
      const bar = w.get('[data-testid="availability-strip-bar"]');
      expect(bar.html()).toContain("bg-danger");
      expect(bar.html()).not.toContain("bg-danger-on-dark");
    });
  });

  describe("状態", () => {
    it("loading=true → shimmer プレースホルダのみ描画", () => {
      const w = mount(AvailabilityStrip, {
        props: { availability: null, variant: "dark", loading: true },
      });
      expect(
        w.find('[data-testid="availability-strip-loading"]').exists(),
      ).toBe(true);
      expect(
        w.find('[data-testid="availability-strip"]').exists(),
      ).toBe(false);
    });

    it("availability=null (取得失敗) → 「—」 fallback、retry ボタン無し", () => {
      const w = mount(AvailabilityStrip, {
        props: { availability: null, variant: "dark" },
      });
      const strip = w.get('[data-testid="availability-strip"]');
      expect(strip.text()).toContain("—");
      expect(w.find("button").exists()).toBe(false);
      // bar も UNCAPPED ラベルも出ない (capacity 不明だから)
      expect(
        w.find('[data-testid="availability-strip-bar"]').exists(),
      ).toBe(false);
      expect(
        w.find('[data-testid="availability-strip-uncapped"]').exists(),
      ).toBe(false);
    });

    it("availability=null × loading=false の light variant も「—」 fallback", () => {
      const w = mount(AvailabilityStrip, {
        props: { availability: null, variant: "light" },
      });
      expect(w.get('[data-testid="availability-strip"]').text()).toContain("—");
    });
  });
});
