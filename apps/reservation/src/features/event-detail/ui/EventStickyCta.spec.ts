import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { unsafeEventId } from "@high-q/shared";
import EventStickyCta from "./EventStickyCta.vue";
import type { EventAvailability } from "@/entities/event";

const EV_ID = unsafeEventId("11111111-1111-1111-1111-111111111111");

function make(
  capacity: number | null,
  reservedCount: number,
): EventAvailability {
  return { eventId: EV_ID, capacity, reservedCount };
}

describe("EventStickyCta", () => {
  it("「予約に進む」押下で proceed イベントが emit される", async () => {
    const wrapper = mount(EventStickyCta, { props: { fee: 1000 } });
    const cta = wrapper
      .findAll("button")
      .find((b) => b.text().includes("予約に進む"));
    expect(cta).toBeDefined();
    await cta?.trigger("click");
    expect(wrapper.emitted("proceed")).toHaveLength(1);
  });

  it("「準備中」案内文言は表示されない", () => {
    const wrapper = mount(EventStickyCta, { props: { fee: 1000 } });
    expect(wrapper.text()).not.toContain("準備中");
  });

  it("参加費を表示する", () => {
    const wrapper = mount(EventStickyCta, { props: { fee: 1500 } });
    expect(wrapper.text()).toContain("1,500 円");
  });

  it("capacity NULL → 「予約に進む」 enabled", () => {
    const wrapper = mount(EventStickyCta, {
      props: { fee: 1000, availability: make(null, 11) },
    });
    const cta = wrapper.get('[data-testid="cta-proceed"]');
    expect(cta.text()).toContain("予約に進む");
    expect(cta.attributes("disabled")).toBeUndefined();
  });

  it("capacity あり、残あり → 「予約に進む」 enabled", () => {
    const wrapper = mount(EventStickyCta, {
      props: { fee: 1000, availability: make(18, 11) },
    });
    const cta = wrapper.get('[data-testid="cta-proceed"]');
    expect(cta.text()).toContain("予約に進む");
    expect(cta.attributes("disabled")).toBeUndefined();
  });

  it("満員 (booked >= capacity) → 「予約締切」 disabled、proceed は emit されない", async () => {
    const wrapper = mount(EventStickyCta, {
      props: { fee: 1000, availability: make(18, 18) },
    });
    const cta = wrapper.get('[data-testid="cta-full"]');
    expect(cta.text()).toContain("予約締切");
    expect(cta.attributes("disabled")).toBeDefined();
    await cta.trigger("click");
    expect(wrapper.emitted("proceed")).toBeUndefined();
  });
});
