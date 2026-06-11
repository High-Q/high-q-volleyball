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

  it("見出しに合計人数 (行数 + 同伴合算) を表示し、リストと必ず一致する", () => {
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

    // 2 行 + 同伴 3 名 = 5 名
    expect(
      wrapper.find('[data-testid="reservation-participants-label"]').text(),
    ).toBe("参加者 5名");
  });

  it("loading 中は見出しに人数を出さない", () => {
    const wrapper = mount(ReservationParticipantsSection, {
      props: {
        participants: [],
        loading: true,
        errorMessage: null,
      },
    });

    expect(
      wrapper.find('[data-testid="reservation-participants-label"]').text(),
    ).toBe("参加者");
  });

  it("nickname 未設定者は「ニックネーム未設定」とグレーアウト表記し、本名や member_id を出さない", () => {
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

    const noNickname = wrapper.find(
      '[data-testid="reservation-participants-no-nickname"]',
    );
    expect(noNickname.text()).toBe("ニックネーム未設定");
    // 本物の nickname (text-ink) と同色で紛れない (グレーアウト)
    expect(noNickname.classes()).toContain("text-muted");
    expect(noNickname.classes()).not.toContain("text-ink");
    expect(wrapper.text()).not.toContain("00000000-0000-0000-0000-000000000099");
  });

  it("空文字 nickname も「ニックネーム未設定」表記に含める", () => {
    const wrapper = mount(ReservationParticipantsSection, {
      props: {
        participants: [participant({ nickname: "" })],
        loading: false,
        errorMessage: null,
      },
    });

    expect(wrapper.text()).toContain("ニックネーム未設定");
  });

  it("本物の nickname は text-ink、未設定表記とスタイルが区別される", () => {
    const wrapper = mount(ReservationParticipantsSection, {
      props: {
        participants: [
          participant({ nickname: "ミサキ" }),
          participant({ nickname: null }),
        ],
        loading: false,
        errorMessage: null,
      },
    });

    const rows = wrapper.findAll(
      '[data-testid="reservation-participants-list"] li',
    );
    expect(rows[0]?.find("span").classes()).toContain("text-ink");
    expect(rows[1]?.find("span").classes()).toContain("text-muted");
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

  it("同伴者がいる予約者の行に「＋同伴N名」を表示する (末尾サマリは出さない)", () => {
    const wrapper = mount(ReservationParticipantsSection, {
      props: {
        participants: [
          participant({ nickname: "ミサキ", guestCount: 2, isSelf: true }),
          participant({ nickname: "タロウ", guestCount: 0 }),
        ],
        loading: false,
        errorMessage: null,
      },
    });

    const guestCounts = wrapper.findAll(
      '[data-testid="reservation-participants-guest-count"]',
    );
    expect(guestCounts).toHaveLength(1);
    expect(guestCounts[0]?.text()).toBe("＋同伴2名");
    // 旧仕様の末尾集約サマリは描画しない
    expect(
      wrapper
        .find('[data-testid="reservation-participants-guest-summary"]')
        .exists(),
    ).toBe(false);
  });

  it("同伴者 0 名の行には同伴表記を描画しない", () => {
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

    expect(
      wrapper
        .find('[data-testid="reservation-participants-guest-count"]')
        .exists(),
    ).toBe(false);
  });

  it("長い nickname (DB 上限 15 文字) も折り返し用クラス付きで全文描画する", () => {
    const longNickname = "あいうえおかきくけこさしすせそ"; // 15 文字
    const wrapper = mount(ReservationParticipantsSection, {
      props: {
        participants: [participant({ nickname: longNickname })],
        loading: false,
        errorMessage: null,
      },
    });

    const name = wrapper.find(
      '[data-testid="reservation-participants-list"] li span',
    );
    expect(name.text()).toBe(longNickname);
    expect(name.classes()).toContain("break-words");
  });

  it("参加者 10 名超は折りたたみ、「すべて表示」で全件展開する", async () => {
    const many = Array.from({ length: 12 }, (_, i) =>
      participant({
        memberId: unsafeMemberId(
          `00000000-0000-0000-0000-${String(i + 1).padStart(12, "0")}`,
        ),
        nickname: `メンバー${i + 1}`,
      }),
    );
    const wrapper = mount(ReservationParticipantsSection, {
      props: { participants: many, loading: false, errorMessage: null },
    });

    expect(
      wrapper.findAll('[data-testid="reservation-participants-list"] li'),
    ).toHaveLength(10);
    // 見出しは折りたたみ中も全件の合計
    expect(
      wrapper.find('[data-testid="reservation-participants-label"]').text(),
    ).toBe("参加者 12名");

    const expand = wrapper.find(
      '[data-testid="reservation-participants-expand"]',
    );
    expect(expand.text()).toContain("すべて表示");
    expect(expand.text()).toContain("あと2名");
    // 「ニックネーム未設定」(text-muted) と区別できる本文色 + シェブロン + 44px タップ領域
    expect(expand.classes()).toContain("text-ink");
    expect(expand.classes()).not.toContain("text-muted");
    expect(expand.classes()).toContain("min-h-[44px]");
    expect(expand.find("svg").exists()).toBe(true);

    await expand.trigger("click");

    expect(
      wrapper.findAll('[data-testid="reservation-participants-list"] li'),
    ).toHaveLength(12);
    expect(
      wrapper
        .find('[data-testid="reservation-participants-expand"]')
        .exists(),
    ).toBe(false);
  });

  it("参加者 10 名以下では「すべて表示」を描画しない", () => {
    const wrapper = mount(ReservationParticipantsSection, {
      props: {
        participants: [participant(), participant()],
        loading: false,
        errorMessage: null,
      },
    });

    expect(
      wrapper
        .find('[data-testid="reservation-participants-expand"]')
        .exists(),
    ).toBe(false);
  });

  it("参加者が自分 1 人だけのとき補足文を表示する", () => {
    const wrapper = mount(ReservationParticipantsSection, {
      props: {
        participants: [participant({ isSelf: true })],
        loading: false,
        errorMessage: null,
      },
    });

    expect(
      wrapper.find('[data-testid="reservation-participants-alone-note"]').text(),
    ).toBe("ほかの参加者はまだいません。");
  });

  it("自分以外もいるとき補足文は描画しない", () => {
    const wrapper = mount(ReservationParticipantsSection, {
      props: {
        participants: [participant({ isSelf: true }), participant()],
        loading: false,
        errorMessage: null,
      },
    });

    expect(
      wrapper
        .find('[data-testid="reservation-participants-alone-note"]')
        .exists(),
    ).toBe(false);
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
