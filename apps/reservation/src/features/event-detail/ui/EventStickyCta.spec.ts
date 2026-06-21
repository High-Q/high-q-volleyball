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

  it("満員 + 未登録 (selfResolved) → 「キャンセル待ちに登録」 enabled、waitlist を emit", async () => {
    const wrapper = mount(EventStickyCta, {
      props: {
        fee: 1000,
        availability: make(18, 18),
        selfStatus: null,
        selfResolved: true,
      },
    });
    const cta = wrapper.get('[data-testid="cta-waitlist"]');
    expect(cta.text()).toContain("キャンセル待ちに登録");
    expect(cta.attributes("disabled")).toBeUndefined();
    await cta.trigger("click");
    expect(wrapper.emitted("waitlist")).toHaveLength(1);
    expect(wrapper.emitted("proceed")).toBeUndefined();
  });

  it("満員 + キャンセル待ち登録済み → 「キャンセル待ち登録済み」 disabled", async () => {
    const wrapper = mount(EventStickyCta, {
      props: {
        fee: 1000,
        availability: make(18, 18),
        selfStatus: "waitlist",
        selfResolved: true,
      },
    });
    const cta = wrapper.get('[data-testid="cta-waitlisted"]');
    expect(cta.text()).toContain("キャンセル待ち登録済み");
    expect(cta.attributes("disabled")).toBeDefined();
    await cta.trigger("click");
    expect(wrapper.emitted("waitlist")).toBeUndefined();
  });

  it("満員 + 予約済み (reserved) → キャンセル待ち導線を出さず「予約締切」", () => {
    const wrapper = mount(EventStickyCta, {
      props: {
        fee: 1000,
        availability: make(18, 18),
        selfStatus: "reserved",
        selfResolved: true,
      },
    });
    expect(wrapper.find('[data-testid="cta-waitlist"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="cta-full"]').text()).toContain("予約締切");
  });

  it("満員 + 自己状態未確定 (selfResolved=false) → 安全側「予約締切」", () => {
    const wrapper = mount(EventStickyCta, {
      props: {
        fee: 1000,
        availability: make(18, 18),
        selfStatus: null,
        selfResolved: false,
      },
    });
    expect(wrapper.find('[data-testid="cta-waitlist"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="cta-full"]').text()).toContain("予約締切");
  });
});
