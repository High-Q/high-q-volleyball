import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import type { MemberId } from "@high-q/shared";
import MembersListTable from "./MembersListTable.vue";

const BASE_ROW = {
  id: "00000000-0000-0000-0000-000000000001" as unknown as MemberId,
  display_name: "田中 美咲",
  email: "misaki@example.com",
  experience_level: "beginner" as const,
  admin_note: null,
  created_at: "2026-04-01T00:00:00Z",
  first_attended_at: null,
  attended_count: 0,
  last_attended_at: null,
  has_identity_document: true,
};

describe("MembersListTable correction badge (#296)", () => {
  it("correction_request_count = 0 でバッジ非表示", () => {
    const wrapper = mount(MembersListTable, {
      props: {
        rows: [{ ...BASE_ROW, correction_request_count: 0 }],
        sort: "last_attended_at",
        dir: "desc",
      },
    });
    expect(wrapper.find("[data-testid='correction-badge']").exists()).toBe(
      false,
    );
  });

  it("correction_request_count = 2 でバッジ表示 + 件数表記", () => {
    const wrapper = mount(MembersListTable, {
      props: {
        rows: [{ ...BASE_ROW, correction_request_count: 2 }],
        sort: "last_attended_at",
        dir: "desc",
      },
    });
    const badge = wrapper.find("[data-testid='correction-badge']");
    expect(badge.exists()).toBe(true);
    expect(badge.text()).toContain("修正依頼 2");
  });

  it("複数行の混在表示", () => {
    const wrapper = mount(MembersListTable, {
      props: {
        rows: [
          {
            ...BASE_ROW,
            id: "11111111-aaaa-4aaa-8aaa-aaaaaaaaaa01" as unknown as MemberId,
            correction_request_count: 0,
          },
          {
            ...BASE_ROW,
            id: "11111111-aaaa-4aaa-8aaa-aaaaaaaaaa02" as unknown as MemberId,
            display_name: "佐藤 健太",
            correction_request_count: 1,
          },
        ],
        sort: "last_attended_at",
        dir: "desc",
      },
    });
    const badges = wrapper.findAll("[data-testid='correction-badge']");
    expect(badges).toHaveLength(1);
    expect(badges[0]?.text()).toContain("修正依頼 1");
  });
});

describe("MembersListTable incomplete signup badge (#293)", () => {
  it("has_identity_document = true でバッジ非表示", () => {
    const wrapper = mount(MembersListTable, {
      props: {
        rows: [
          { ...BASE_ROW, correction_request_count: 0, has_identity_document: true },
        ],
        sort: "last_attended_at",
        dir: "desc",
      },
    });
    expect(
      wrapper.find("[data-testid='incomplete-signup-badge']").exists(),
    ).toBe(false);
  });

  it("has_identity_document = false でバッジ表示 + aria-label", () => {
    const wrapper = mount(MembersListTable, {
      props: {
        rows: [
          { ...BASE_ROW, correction_request_count: 0, has_identity_document: false },
        ],
        sort: "last_attended_at",
        dir: "desc",
      },
    });
    const badge = wrapper.find("[data-testid='incomplete-signup-badge']");
    expect(badge.exists()).toBe(true);
    expect(badge.text()).toContain("書類未提出");
    expect(badge.attributes("aria-label")).toBe("本人確認書類が未提出");
  });

  it("修正依頼バッジと書類未提出バッジが両方並列表示される", () => {
    const wrapper = mount(MembersListTable, {
      props: {
        rows: [
          { ...BASE_ROW, correction_request_count: 1, has_identity_document: false },
        ],
        sort: "last_attended_at",
        dir: "desc",
      },
    });
    const correctionBadge = wrapper.find("[data-testid='correction-badge']");
    const incompleteBadge = wrapper.find(
      "[data-testid='incomplete-signup-badge']",
    );
    expect(correctionBadge.exists()).toBe(true);
    expect(incompleteBadge.exists()).toBe(true);
    expect(correctionBadge.text()).toContain("修正依頼 1");
    expect(incompleteBadge.text()).toContain("書類未提出");
  });
});

describe("MembersListTable モバイルカード (#155)", () => {
  it("Table は hidden md:block、カードリストは md:hidden で出し分ける", () => {
    const wrapper = mount(MembersListTable, {
      props: {
        rows: [{ ...BASE_ROW, correction_request_count: 0 }],
        sort: "last_attended_at",
        dir: "desc",
      },
    });
    expect(wrapper.find(".hq-table-wrapper").classes()).toContain("hidden");
    expect(wrapper.find(".hq-table-wrapper").classes()).toContain("md:block");
    expect(wrapper.find("ul[role='list']").classes()).toContain("md:hidden");
  });

  it("カードに全項目を保持する (名前/メール/経験/初回/累計/最終/メモ)", () => {
    const wrapper = mount(MembersListTable, {
      props: {
        rows: [
          {
            ...BASE_ROW,
            correction_request_count: 0,
            email: "misaki@example.com",
            attended_count: 5,
          },
        ],
        sort: "last_attended_at",
        dir: "desc",
      },
    });
    const card = wrapper.find("ul[role='list'] > li");
    expect(card.exists()).toBe(true);
    const text = card.text();
    expect(text).toContain("田中 美咲");
    expect(text).toContain("misaki@example.com");
    expect(text).toContain("5 回");
  });

  it("カードのタップで click-row を emit する", async () => {
    const wrapper = mount(MembersListTable, {
      props: {
        rows: [{ ...BASE_ROW, correction_request_count: 0 }],
        sort: "last_attended_at",
        dir: "desc",
      },
    });
    await wrapper.find("ul[role='list'] > li").trigger("click");
    const emitted = wrapper.emitted("click-row");
    expect(emitted).toBeTruthy();
    expect(emitted?.[0]?.[0]).toBe(BASE_ROW.id);
  });
});
