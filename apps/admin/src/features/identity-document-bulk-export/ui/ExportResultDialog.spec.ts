import { mount, flushPromises } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import ExportResultDialog from "./ExportResultDialog.vue";
import type { MemberId } from "@high-q/shared";
import type { BulkExportResult } from "../composables/useBulkExport";

const baseResult: BulkExportResult = {
  includedDocumentCount: 3,
  rosterMemberCount: 4,
  membersWithoutApprovedDocs: [
    { id: "m9" as unknown as MemberId, name: "鈴木 一郎" },
  ],
  failedImages: [],
  auditLogged: true,
};

afterEach(() => {
  document.body.innerHTML = "";
});

async function mountOpen(props: {
  result: BulkExportResult | null;
  errorMessage?: string | null;
}) {
  const wrapper = mount(ExportResultDialog, {
    props: { open: true, ...props },
    attachTo: document.body,
  });
  await flushPromises();
  return wrapper;
}

describe("ExportResultDialog", () => {
  it("成功サマリ（含めた件数 / 承認済みなし会員 / 失敗書類）を表示する", async () => {
    await mountOpen({ result: baseResult, errorMessage: null });
    const body = document.body.textContent ?? "";
    expect(body).toContain("3 件");
    expect(body).toContain("4 名");
    expect(body).toContain("鈴木 一郎");
  });

  it("監査ログ失敗時に role=alert の警告を出す", async () => {
    await mountOpen({
      result: { ...baseResult, auditLogged: false },
      errorMessage: null,
    });
    const alert = document.body.querySelector("[role='alert']");
    expect(alert?.textContent ?? "").toContain("監査ログの記録に失敗");
  });

  it("エラー時は role=alert + 再試行ボタンを出す", async () => {
    const wrapper = await mountOpen({
      result: null,
      errorMessage: "ネットワークエラー",
    });
    const alert = document.body.querySelector("[role='alert']");
    expect(alert?.textContent ?? "").toContain("ネットワークエラー");
    const retry = Array.from(
      document.body.querySelectorAll<HTMLButtonElement>("button"),
    ).find((b) => b.textContent?.includes("再試行"));
    expect(retry).toBeTruthy();
    retry?.click();
    expect(wrapper.emitted("retry")).toBeTruthy();
  });
});
