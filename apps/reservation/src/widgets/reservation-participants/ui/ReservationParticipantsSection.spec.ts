import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { unsafeMemberId } from "@high-q/shared";
import type { EventParticipantNickname } from "@/entities/event";
import ReservationParticipantsSection from "./ReservationParticipantsSection.vue";

function participant(
  overrides: Partial<EventParticipantNickname> = {},
): EventParticipantNickname {
  return {
    memberId: unsafeMemberId(
      overrides.memberId ?? `00000000-0000-0000-0000-${Math.random().toString(16).slice(2, 14).padEnd(12, "0")}`,
    ),
    nickname: "ミサキ",
    isSelf: false,
    guestCount: 0,
    ...overrides,
  };
}

describe("ReservationParticipantsSection", () => {
  it("通常描画: 参加者複数名 + 自分含むリストを表示する", () => {
    const wrapper = mount(ReservationParticipantsSection, {
      props: {
        participants: [
          participant({
            memberId: unsafeMemberId("00000000-0000-0000-0000-000000000001"),
            nickname: "ミサキ",
            isSelf: true,
          }),
          participant({
            memberId: unsafeMemberId("00000000-0000-0000-0000-000000000002"),
            nickname: "タロウ",
          }),
        ],
        loading: false,
        errorMessage: null,
      },
    });

    expect(wrapper.text()).toContain("参加者");
    expect(wrapper.text()).toContain("ミサキ");
    expect(wrapper.text()).toContain("タロウ");
    expect(
      wrapper.findAll('[data-testid="reservation-participants-list"] li'),
    ).toHaveLength(2);
  });

  it("nickname 未設定者は「参加メンバー」と表記し、本名や member_id を出さない", () => {
    const wrapper = mount(ReservationParticipantsSection, {
      props: {
        participants: [
          participant({
            memberId: unsafeMemberId("00000000-0000-0000-0000-000000000099"),
            nickname: null,
          }),
        ],
        loading: false,
        errorMessage: null,
      },
    });

    expect(wrapper.text()).toContain("参加メンバー");
    expect(wrapper.text()).not.toContain("00000000-0000-0000-0000-000000000099");
  });

  it("空文字 nickname も「参加メンバー」マスクに含める", () => {
    const wrapper = mount(ReservationParticipantsSection, {
      props: {
        participants: [participant({ nickname: "" })],
        loading: false,
        errorMessage: null,
      },
    });

    expect(wrapper.text()).toContain("参加メンバー");
  });

  it("自分の行に「あなた」マーカーが付与される", () => {
    const wrapper = mount(ReservationParticipantsSection, {
      props: {
        participants: [
          participant({
            nickname: "ミサキ",
            isSelf: true,
          }),
          participant({
            nickname: "タロウ",
            isSelf: false,
          }),
        ],
        loading: false,
        errorMessage: null,
      },
    });

    const selfMarkers = wrapper.findAll(
      '[data-testid="reservation-participants-self-marker"]',
    );
    expect(selfMarkers).toHaveLength(1);
    expect(selfMarkers[0]?.text()).toBe("あなた");
  });

  it("同伴者の合算が 1 以上のとき「同伴者 +N 名」サマリを描画する", () => {
    const wrapper = mount(ReservationParticipantsSection, {
      props: {
        participants: [
          participant({ guestCount: 2, isSelf: true }),
          participant({ guestCount: 1 }),
        ],
        loading: false,
        errorMessage: null,
      },
    });

    const summary = wrapper.find(
      '[data-testid="reservation-participants-guest-summary"]',
    );
    expect(summary.exists()).toBe(true);
    expect(summary.text()).toBe("同伴者 +3 名");
  });

  it("同伴者の合算が 0 のときサマリ行を描画しない", () => {
    const wrapper = mount(ReservationParticipantsSection, {
      props: {
        participants: [
          participant({ guestCount: 0, isSelf: true }),
          participant({ guestCount: 0 }),
        ],
        loading: false,
        errorMessage: null,
      },
    });

    const summary = wrapper.find(
      '[data-testid="reservation-participants-guest-summary"]',
    );
    expect(summary.exists()).toBe(false);
  });

  it("loading 中は skeleton を表示し、参加者リストは描画しない", () => {
    const wrapper = mount(ReservationParticipantsSection, {
      props: {
        participants: [],
        loading: true,
        errorMessage: null,
      },
    });

    expect(
      wrapper.find('[data-testid="reservation-participants-loading"]').exists(),
    ).toBe(true);
    expect(
      wrapper.find('[data-testid="reservation-participants-list"]').exists(),
    ).toBe(false);
  });

  it("errorMessage が設定されているときはセクション内エラーメッセージを表示し、retry ボタンを描画しない", () => {
    const wrapper = mount(ReservationParticipantsSection, {
      props: {
        participants: [],
        loading: false,
        errorMessage: "参加者一覧を取得できませんでした",
      },
    });

    expect(
      wrapper.find('[data-testid="reservation-participants-error"]').text(),
    ).toBe("参加者一覧を取得できませんでした");
    // セクション単独 retry ボタンは MUST NOT 配置 (画面全体 retry に集約)
    expect(wrapper.find("button").exists()).toBe(false);
  });

  it("本名 / メール / 電話番号 / 生年月日 / 経験レベル は DOM に出ない (ネガティブ検証)", () => {
    const wrapper = mount(ReservationParticipantsSection, {
      props: {
        participants: [
          participant({
            nickname: "ミサキ",
            isSelf: true,
            guestCount: 1,
          }),
        ],
        loading: false,
        errorMessage: null,
      },
    });

    const html = wrapper.html();
    // props にそもそも email/phone 等は無いので DOM に出る経路は無いが、保険として検証
    expect(html).not.toMatch(/@/); // メール記号
    expect(html).not.toMatch(/\d{3}-\d{4}/); // 電話番号らしき表現
    expect(html).not.toMatch(/19\d{2}|20\d{2}/); // 生年月日らしき年表現 (本機能の汎用文言に年は含めない)
  });
});
