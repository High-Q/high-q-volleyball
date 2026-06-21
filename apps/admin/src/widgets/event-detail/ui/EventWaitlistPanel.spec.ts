import { mount, flushPromises } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { EventId } from "@high-q/shared";
import type { ParticipantRow } from "@/entities/reservation";
import EventWaitlistPanel from "./EventWaitlistPanel.vue";

const getEventParticipantsMock = vi.fn();

vi.mock("@/entities/reservation", () => ({
  getEventParticipants: (...args: unknown[]) =>
    getEventParticipantsMock(...args),
}));

const EV = "e0000000-0000-0000-0000-000000000001" as unknown as EventId;

function row(
  id: string,
  status: ParticipantRow["status"],
  createdAt: string,
  guestCount = 0,
  displayName = `会員${id}`,
): ParticipantRow {
  return {
    reservation_id: id as unknown as ParticipantRow["reservation_id"],
    event_id: EV as unknown as ParticipantRow["event_id"],
    member_id: `m-${id}` as unknown as ParticipantRow["member_id"],
    display_name: displayName,
    nickname: null,
    email: `${id}@example.com`,
    experience_level: "beginner",
    guest_count: guestCount,
    status,
    checked_in_at: null,
    created_at: createdAt,
    is_first_time: false,
  } as unknown as ParticipantRow;
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("EventWaitlistPanel", () => {
  it("waitlist のみ抽出し、取得順 (created_at ASC) で描画する", async () => {
    getEventParticipantsMock.mockResolvedValueOnce({
      ok: true,
      value: [
        row("a", "reserved", "2026-06-01T00:00:00Z"),
        row("w1", "waitlist", "2026-06-02T00:00:00Z"),
        row("b", "attended", "2026-06-03T00:00:00Z"),
        row("w2", "waitlist", "2026-06-04T00:00:00Z", 1),
      ],
    });
    const wrapper = mount(EventWaitlistPanel, { props: { eventId: EV } });
    await flushPromises();

    const rows = wrapper.findAll('[data-testid="waitlist-row"]');
    expect(rows).toHaveLength(2);
    expect(rows[0]?.text()).toContain("会員w1");
    expect(rows[1]?.text()).toContain("会員w2");
    // 同伴者数 / 計人数の表示
    expect(rows[1]?.text()).toContain("同伴 1 名");
    expect(rows[1]?.text()).toContain("計 2 名");
  });

  it("waitlist 0 件で empty 表示", async () => {
    getEventParticipantsMock.mockResolvedValueOnce({
      ok: true,
      value: [row("a", "reserved", "2026-06-01T00:00:00Z")],
    });
    const wrapper = mount(EventWaitlistPanel, { props: { eventId: EV } });
    await flushPromises();

    expect(wrapper.find('[data-testid="waitlist-empty"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="waitlist-list"]').exists()).toBe(false);
  });

  it("取得失敗でエラー表示", async () => {
    getEventParticipantsMock.mockResolvedValueOnce({
      ok: false,
      error: { code: "SERVER_ERROR", message: "boom" },
    });
    const wrapper = mount(EventWaitlistPanel, { props: { eventId: EV } });
    await flushPromises();

    expect(wrapper.find('[role="alert"]').exists()).toBe(true);
    expect(wrapper.text()).toContain("キャンセル待ちの取得に失敗しました");
  });
});
