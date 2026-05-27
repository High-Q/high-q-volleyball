import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import {
  unsafeEventId,
  unsafeReservationId,
  unsafeVenueId,
} from "@high-q/shared";
import type { MyReservationItem } from "@/entities/reservation";
import StatsSection from "./StatsSection.vue";

function makeItem(
  status: MyReservationItem["status"],
  startAt: string,
  id: string = "00000000-0000-0000-0000-000000000001",
): MyReservationItem {
  void unsafeVenueId("00000000-0000-0000-0000-aaaaaaaaaaaa");
  return {
    id: unsafeReservationId(id),
    status,
    guestCount: 0,
    cancelledAt: null,
    event: {
      id: unsafeEventId("00000000-0000-0000-0000-eeeeeeeeeeee"),
      name: "ゆる練 vol.42",
      startAt,
      endAt: startAt,
      fee: null,
      venueName: "亀戸スポーツセンター",
      availability: null,
    },
  };
}

describe("StatsSection (#211 縮小後: 集計 3 行のみ)", () => {
  it("累計参加 / 最終参加 / 次回予定 の 3 行を描画する", () => {
    const wrapper = mount(StatsSection, {
      props: {
        reservations: [
          makeItem("attended", "2026-04-12T19:00:00+09:00"),
          makeItem(
            "reserved",
            "2026-12-31T19:00:00+09:00",
            "00000000-0000-0000-0000-000000000002",
          ),
        ],
      },
    });
    expect(wrapper.text()).toContain("累計参加");
    expect(wrapper.text()).toContain("最終参加");
    expect(wrapper.text()).toContain("次回予定");
  });

  it("予約 0 件のとき集計値は「—」表示", () => {
    const wrapper = mount(StatsSection, { props: { reservations: [] } });
    const dds = wrapper.findAll("dd");
    expect(dds).toHaveLength(3);
    dds.forEach((dd) => {
      expect(dd.text()).toContain("—");
    });
  });

  it("履歴一覧 (個別予約行のリスト) を描画しない (#211 移管)", () => {
    const wrapper = mount(StatsSection, {
      props: {
        reservations: [
          makeItem("attended", "2026-04-12T19:00:00+09:00"),
          makeItem(
            "reserved",
            "2026-06-01T19:00:00+09:00",
            "00000000-0000-0000-0000-000000000002",
          ),
        ],
      },
    });
    // STATS セクションには <ul>/<li> による履歴リストがあってはならない。
    // 次回予定行はイベント名を含む 1 行集計として残るが、会場名や状態バッジ等の
    // 詳細を持つ個別履歴行は描画されない。
    expect(wrapper.find("ul").exists()).toBe(false);
    expect(wrapper.text()).not.toContain("亀戸スポーツセンター");
    expect(wrapper.findAll('[data-testid="history-row"]')).toHaveLength(0);
  });

  it("個別キャンセルボタンを描画しない (#211 移管)", () => {
    const wrapper = mount(StatsSection, {
      props: {
        reservations: [
          makeItem("reserved", "2026-06-01T19:00:00+09:00"),
        ],
      },
    });
    expect(wrapper.find("button").exists()).toBe(false);
    expect(wrapper.text()).not.toContain("予約をキャンセル");
  });

  it("HISTORY · 予約履歴 kicker も描画されない", () => {
    const wrapper = mount(StatsSection, {
      props: {
        reservations: [
          makeItem("attended", "2026-04-12T19:00:00+09:00"),
        ],
      },
    });
    expect(wrapper.text()).not.toContain("HISTORY");
    expect(wrapper.text()).not.toContain("予約履歴");
  });
});
