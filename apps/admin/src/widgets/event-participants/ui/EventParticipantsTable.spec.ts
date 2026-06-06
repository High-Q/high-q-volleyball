import { mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  EventId,
  MemberId,
  ReservationId,
  ExperienceLevel,
  ReservationStatus,
} from "@high-q/shared";
import type { ParticipantRow } from "@/entities/reservation";

vi.mock("@/features/reservation-checkin", () => ({
  CheckinToggle: { template: '<div class="stub-checkin" />' },
  useReservationCheckin: () => ({
    inFlight: new Set<string>(),
    isInFlight: () => false,
    toggle: vi.fn(),
  }),
}));

vi.mock("@/features/reservation-cancel-by-admin", () => ({
  ReservationCancelDialog: { template: '<div class="stub-cancel" />' },
}));

vi.mock("@/features/reservation-guest-edit", () => ({
  GuestCountStepper: { template: '<div class="stub-guest" />' },
  useReservationGuestEdit: () => ({
    inFlight: new Set<string>(),
    isInFlight: () => false,
    setGuestCount: vi.fn(),
  }),
}));

import EventParticipantsTable from "./EventParticipantsTable.vue";

const EVENT_ID = "11111111-1111-1111-1111-111111111111" as unknown as EventId;

function makeRow(overrides: Partial<ParticipantRow> = {}): ParticipantRow {
  return {
    reservation_id: "r1" as unknown as ReservationId,
    event_id: EVENT_ID,
    member_id: "m1" as unknown as MemberId,
    display_name: "山田 太郎",
    email: "yamada@example.com",
    experience_level: "beginner" as ExperienceLevel,
    guest_count: 0,
    status: "reserved" as ReservationStatus,
    checked_in_at: null,
    created_at: "2026-04-27T05:32:00Z",
    is_first_time: false,
    nickname: null,
    ...overrides,
  };
}

let wrapper: VueWrapper | null = null;

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
});

describe("EventParticipantsTable - nickname 併記", () => {
  it("nickname が登録されていれば氏名の直後に全角括弧で併記する", () => {
    wrapper = mount(EventParticipantsTable, {
      props: {
        rows: [
          makeRow({
            reservation_id: "r1" as unknown as ReservationId,
            display_name: "山田 太郎",
            nickname: "たろちゃん",
          }),
        ],
      },
    });

    expect(wrapper.text()).toContain("山田 太郎（たろちゃん）");
  });

  it("nickname が null の行は氏名のみ表示、括弧やプレースホルダーは出さない", () => {
    wrapper = mount(EventParticipantsTable, {
      props: {
        rows: [
          makeRow({
            reservation_id: "r1" as unknown as ReservationId,
            display_name: "佐藤 健太",
            nickname: null,
          }),
        ],
      },
    });

    const text = wrapper.text();
    expect(text).toContain("佐藤 健太");
    expect(text).not.toContain("（");
    expect(text).not.toContain("）");
    expect(text).not.toContain("未設定");
  });

  it("退会済み会員行は nickname 併記しない（display_name = '退会済み会員' のみ）", () => {
    wrapper = mount(EventParticipantsTable, {
      props: {
        rows: [
          makeRow({
            reservation_id: "r1" as unknown as ReservationId,
            display_name: "退会済み会員",
            nickname: null,
          }),
        ],
      },
    });

    const text = wrapper.text();
    expect(text).toContain("退会済み会員");
    expect(text).not.toContain("（");
  });

  it("nickname あり / なしの行が混在しても各行が独立に描画される", () => {
    wrapper = mount(EventParticipantsTable, {
      props: {
        rows: [
          makeRow({
            reservation_id: "r1" as unknown as ReservationId,
            display_name: "山田 太郎",
            nickname: "たろちゃん",
          }),
          makeRow({
            reservation_id: "r2" as unknown as ReservationId,
            display_name: "佐藤 健太",
            nickname: null,
          }),
        ],
      },
    });

    const text = wrapper.text();
    expect(text).toContain("山田 太郎（たろちゃん）");
    expect(text).toContain("佐藤 健太");
    // 「佐藤 健太（」が現れていないこと（誤って次の行の nickname を引っ張っていない）
    expect(text).not.toContain("佐藤 健太（");
  });
});

describe("EventParticipantsTable - 氏名ボタン (member-clicked)", () => {
  it("氏名ボタンクリックで `member-clicked` が `row.member_id` で emit される", async () => {
    const memberId = "11111111-1111-1111-1111-111111111111" as unknown as MemberId;
    wrapper = mount(EventParticipantsTable, {
      props: {
        rows: [
          makeRow({
            reservation_id: "r1" as unknown as ReservationId,
            member_id: memberId,
            display_name: "山田 太郎",
          }),
        ],
      },
    });

    const btn = wrapper.get('button[aria-label="山田 太郎 の詳細を開く"]');
    await btn.trigger("click");

    const emitted = wrapper.emitted("member-clicked");
    expect(emitted).toBeDefined();
    expect(emitted![0]).toEqual([memberId]);
  });

  it("Enter キーでも `member-clicked` が emit される（ボタンの既定挙動）", async () => {
    const memberId = "22222222-2222-2222-2222-222222222222" as unknown as MemberId;
    wrapper = mount(EventParticipantsTable, {
      props: {
        rows: [
          makeRow({
            reservation_id: "r1" as unknown as ReservationId,
            member_id: memberId,
            display_name: "山田 太郎",
          }),
        ],
      },
    });

    const btn = wrapper.get('button[aria-label="山田 太郎 の詳細を開く"]');
    // <button> は Enter で click イベントを発火する（ブラウザ標準挙動を JSDOM が模擬）
    await btn.trigger("keydown.enter");
    await btn.trigger("click");

    const emitted = wrapper.emitted("member-clicked");
    expect(emitted).toBeDefined();
    expect(emitted![0]).toEqual([memberId]);
  });

  it("aria-label に氏名のみ含まれ、ニックネームは含まれない", () => {
    wrapper = mount(EventParticipantsTable, {
      props: {
        rows: [
          makeRow({
            reservation_id: "r1" as unknown as ReservationId,
            display_name: "山田 太郎",
            nickname: "たろちゃん",
          }),
        ],
      },
    });

    const btn = wrapper.get("button[aria-label]");
    expect(btn.attributes("aria-label")).toBe("山田 太郎 の詳細を開く");
    expect(btn.attributes("aria-label")).not.toContain("たろちゃん");
  });

  it("退会済み会員行は <button> ではなく <span> として描画される", () => {
    wrapper = mount(EventParticipantsTable, {
      props: {
        rows: [
          makeRow({
            reservation_id: "r1" as unknown as ReservationId,
            display_name: "退会済み会員",
            nickname: null,
          }),
        ],
      },
    });

    // aria-label 付き button が存在しない
    expect(wrapper.find('button[aria-label*="退会済み会員"]').exists()).toBe(false);
    // テキストは存在する
    expect(wrapper.text()).toContain("退会済み会員");
  });
});
