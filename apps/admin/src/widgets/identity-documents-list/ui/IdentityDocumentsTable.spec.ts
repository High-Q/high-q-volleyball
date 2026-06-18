import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import type { IdentityDocumentId, MemberId } from "@high-q/shared";
import IdentityDocumentsTable from "./IdentityDocumentsTable.vue";
import type { IdentityDocumentListRow } from "@/entities/identity-document";

/**
 * #155 デスクトップ Table / モバイルカード切替の検証。
 */
const ROW: IdentityDocumentListRow = {
  id: "11111111-1111-4111-8111-111111111111" as unknown as IdentityDocumentId,
  member_id: "22222222-2222-4222-8222-222222222222" as unknown as MemberId,
  document_type: "drivers_license",
  status: "pending",
  uploaded_at: "2026-05-01T10:30:00+09:00",
  member: { display_name: "山田 太郎", email: "taro@example.com" },
};

function renderTable(rows: ReadonlyArray<IdentityDocumentListRow>) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: "/identity-documents/:id",
        name: "identity-document-detail",
        component: { template: "<div />" },
      },
    ],
  });
  return mount(IdentityDocumentsTable, {
    props: { rows },
    global: { plugins: [router] },
  });
}

describe("IdentityDocumentsTable モバイルカード (#155)", () => {
  it("Table は hidden md:block、カードリストは md:hidden で出し分ける", () => {
    const wrapper = renderTable([ROW]);
    const tableWrapper = wrapper.find(".hidden.overflow-x-auto");
    expect(tableWrapper.exists()).toBe(true);
    expect(tableWrapper.classes()).toContain("md:block");
    expect(wrapper.find("ul[role='list']").classes()).toContain("md:hidden");
  });

  it("カードに全項目を保持する (提出日時/名前/メール/種別/ステータス/詳細)", () => {
    const wrapper = renderTable([ROW]);
    const card = wrapper.find("ul[role='list'] > li");
    expect(card.exists()).toBe(true);
    const text = card.text();
    expect(text).toContain("山田 太郎");
    expect(text).toContain("taro@example.com");
    expect(text).toContain("05/01 10:30");
    expect(text).toContain("確認中"); // status pending ラベル
    const detail = card
      .findAll("a")
      .find((a) => a.attributes("href")?.includes("/identity-documents/"));
    expect(detail?.text()).toBe("詳細");
  });

  it("マイナンバーカードのカードは書類種別が danger 配色になる", () => {
    const wrapper = renderTable([
      { ...ROW, document_type: "my_number_card_masked" },
    ]);
    const card = wrapper.find("ul[role='list'] > li");
    const badge = card
      .findAll("span")
      .find((s) => s.classes().includes("bg-danger-soft"));
    expect(badge).toBeDefined();
  });
});
