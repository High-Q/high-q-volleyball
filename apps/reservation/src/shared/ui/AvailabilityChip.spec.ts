import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { unsafeEventId } from "@high-q/shared";
import AvailabilityChip from "./AvailabilityChip.vue";
import type { EventAvailability } from "@/entities/event";

const EV_ID = unsafeEventId("11111111-1111-1111-1111-111111111111");

function make(
  capacity: number | null,
  reservedCount: number,
): EventAvailability {
  return { eventId: EV_ID, capacity, reservedCount };
}

describe("AvailabilityChip", () => {
  it("capacity NULL × reservedCount 11 → 「11 名 予約中」", () => {
    const w = mount(AvailabilityChip, {
      props: { availability: make(null, 11) },
    });
    expect(w.get('[data-testid="availability-chip"]').text()).toBe(
      "11 名 予約中",
    );
  });

  it("capacity 18 × reservedCount 11 → 「あと 7 名 募集」 (tone=ok)", () => {
    const w = mount(AvailabilityChip, {
      props: { availability: make(18, 11) },
    });
    const chip = w.get('[data-testid="availability-chip"]');
    expect(chip.text()).toBe("あと 7 名 募集");
    expect(chip.classes()).toContain("text-ink-soft");
  });

  it("capacity 18 × reservedCount 18 → 「満員」 (tone=full)", () => {
    const w = mount(AvailabilityChip, {
      props: { availability: make(18, 18) },
    });
    const chip = w.get('[data-testid="availability-chip"]');
    expect(chip.text()).toBe("満員");
    expect(chip.classes()).toContain("text-danger");
  });

  it("capacity 10 × reservedCount 9 (90%) → tone=warn", () => {
    const w = mount(AvailabilityChip, {
      props: { availability: make(10, 9) },
    });
    const chip = w.get('[data-testid="availability-chip"]');
    expect(chip.text()).toBe("あと 1 名 募集");
    expect(chip.classes()).toContain("text-warn");
  });

  it("loading=true → shimmer プレースホルダのみ描画", () => {
    const w = mount(AvailabilityChip, {
      props: { availability: null, loading: true },
    });
    expect(w.find('[data-testid="availability-chip-loading"]').exists()).toBe(
      true,
    );
    expect(w.find('[data-testid="availability-chip"]').exists()).toBe(false);
  });

  it("availability=null (取得失敗) → 「—」 fallback、再読込ボタンは描画されない", () => {
    const w = mount(AvailabilityChip, { props: { availability: null } });
    expect(w.get('[data-testid="availability-chip"]').text()).toBe("—");
    expect(w.find("button").exists()).toBe(false);
  });

  it("reservedCount=0 → 「0 名 予約中」 (煽り文言なし)", () => {
    const w = mount(AvailabilityChip, {
      props: { availability: make(null, 0) },
    });
    const text = w.get('[data-testid="availability-chip"]').text();
    expect(text).toBe("0 名 予約中");
    expect(text).not.toContain("一番乗り");
    expect(text).not.toContain("どうぞ");
  });
});
