import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import EventStatCards from "./EventStatCards.vue";
import type { EventDetailRow } from "@/entities/event-detail";

function makeRow(overrides: Partial<EventDetailRow>): EventDetailRow {
  return {
    id: "x" as never,
    name: "test",
    description: null,
    start_at: "2026-04-28T10:30:00Z",
    end_at: "2026-04-28T12:30:00Z",
    venue_id: "v" as never,
    venue_name: "亀戸",
    fee: 1000,
    capacity: null,
    visibility: "published",
    status: "scheduled",
    cancel_deadline: null,
    reserved_count: 0,
    checked_in_count: 0,
    first_time_count: 0,
    waitlist_count: 0,
    created_at: "2026-04-01T00:00:00Z",
    updated_at: "2026-04-01T00:00:00Z",
    ...overrides,
  };
}

describe("EventStatCards — 描画", () => {
  it("4 枚の StatCard が描画される", () => {
    const w = mount(EventStatCards, {
      props: { row: makeRow({}) },
    });
    const cards = w.findAll("[data-testid='event-stat-card']");
    expect(cards).toHaveLength(4);
  });

  it("Kicker 番号 01〜04 が表示される", () => {
    const w = mount(EventStatCards, {
      props: { row: makeRow({}) },
    });
    const text = w.text();
    expect(text).toContain("01");
    expect(text).toContain("02");
    expect(text).toContain("03");
    expect(text).toContain("04");
  });
});

describe("EventStatCards — capacity NULL（MVP1 デフォルト）", () => {
  it("1 番目は「予約数」ラベル + reserved_count + 「名」", () => {
    const w = mount(EventStatCards, {
      props: {
        row: makeRow({
          capacity: null,
          reserved_count: 16,
          checked_in_count: 4,
          first_time_count: 2,
          waitlist_count: 0,
        }),
      },
    });
    const labels = w.findAll("[data-testid='stat-label']");
    expect(labels[0]!.text()).toBe("予約数");
    const values = w.findAll("[data-testid='stat-value']");
    expect(values[0]!.text()).toBe("16");
    const units = w.findAll("[data-testid='stat-unit']");
    expect(units[0]!.text()).toBe("名");
  });

  it("2 番目「チェックイン」 4 / 16", () => {
    const w = mount(EventStatCards, {
      props: {
        row: makeRow({
          capacity: null,
          reserved_count: 16,
          checked_in_count: 4,
        }),
      },
    });
    const labels = w.findAll("[data-testid='stat-label']");
    const values = w.findAll("[data-testid='stat-value']");
    const units = w.findAll("[data-testid='stat-unit']");
    expect(labels[1]!.text()).toBe("チェックイン");
    expect(values[1]!.text()).toBe("4");
    expect(units[1]!.text()).toBe("/ 16");
  });

  it("3 番目「初回参加」 + 4 番目「キャンセル待ち」", () => {
    const w = mount(EventStatCards, {
      props: {
        row: makeRow({
          first_time_count: 2,
          waitlist_count: 0,
        }),
      },
    });
    const labels = w.findAll("[data-testid='stat-label']");
    const values = w.findAll("[data-testid='stat-value']");
    expect(labels[2]!.text()).toBe("初回参加");
    expect(values[2]!.text()).toBe("2");
    expect(labels[3]!.text()).toBe("キャンセル待ち");
    expect(values[3]!.text()).toBe("0");
  });
});

describe("EventStatCards — capacity あり（将来 MVP2）", () => {
  it("1 番目は「残席」ラベル + (capacity - reserved_count) + 「/ capacity 名」", () => {
    const w = mount(EventStatCards, {
      props: {
        row: makeRow({
          capacity: 18,
          reserved_count: 16,
        }),
      },
    });
    const labels = w.findAll("[data-testid='stat-label']");
    const values = w.findAll("[data-testid='stat-value']");
    const units = w.findAll("[data-testid='stat-unit']");
    expect(labels[0]!.text()).toBe("残席");
    expect(values[0]!.text()).toBe("2");
    expect(units[0]!.text()).toBe("/ 18 名");
  });

  it("満員（reserved >= capacity）でも残席は 0 で下回らない", () => {
    const w = mount(EventStatCards, {
      props: {
        row: makeRow({
          capacity: 18,
          reserved_count: 20, // 万一の overbook 状態
        }),
      },
    });
    const values = w.findAll("[data-testid='stat-value']");
    expect(values[0]!.text()).toBe("0");
  });
});

describe("EventStatCards — optimistic 反映の props 受け取り", () => {
  it("checked_in_count props 変更で表示も追従", async () => {
    const w = mount(EventStatCards, {
      props: {
        row: makeRow({ checked_in_count: 4, reserved_count: 16 }),
      },
    });
    const valuesBefore = w.findAll("[data-testid='stat-value']");
    expect(valuesBefore[1]!.text()).toBe("4");

    await w.setProps({
      row: makeRow({ checked_in_count: 5, reserved_count: 16 }),
    });

    const valuesAfter = w.findAll("[data-testid='stat-value']");
    expect(valuesAfter[1]!.text()).toBe("5");
  });

  it("reserved_count props 変更で 1 番目（予約数）も追従", async () => {
    const w = mount(EventStatCards, {
      props: {
        row: makeRow({ capacity: null, reserved_count: 16 }),
      },
    });
    await w.setProps({
      row: makeRow({ capacity: null, reserved_count: 15 }),
    });
    const values = w.findAll("[data-testid='stat-value']");
    expect(values[0]!.text()).toBe("15");
  });
});
