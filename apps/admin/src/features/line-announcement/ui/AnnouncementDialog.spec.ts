import { mount, flushPromises, type VueWrapper } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ok, err, unsafeEventId, unsafeVenueId } from "@high-q/shared";
import type { EventDetailRow } from "@/entities/event-detail";

/**
 * spec: openspec/changes/line-announcement-copy/specs/admin-announcement/spec.md
 *   「告知文ダイアログ」
 */

const fetchMock = vi.fn();
vi.mock("@/entities/announcement-template", async () => {
  const actual = await vi.importActual<typeof import("@/entities/announcement-template")>(
    "@/entities/announcement-template",
  );
  return { ...actual, fetchAnnouncementTemplate: fetchMock };
});

const toastMock = vi.fn();
vi.mock("@/shared/ui/useToast", () => ({
  useToast: () => ({ toast: toastMock }),
}));

const pushMock = vi.fn();
vi.mock("vue-router", () => ({
  useRouter: () => ({ push: pushMock }),
}));

const EVENT = {
  id: unsafeEventId("ev-1"),
  name: "ゆる練",
  description: null,
  start_at: "2026-11-14T09:00:00Z",
  end_at: "2026-11-14T11:00:00Z",
  venue_id: unsafeVenueId("v-1"),
  venue_name: "有明会場",
  fee: 1000,
  capacity: 24,
  vol: 42,
} as unknown as EventDetailRow;

const TEMPLATE = {
  channel: "line" as const,
  body: "{イベント名}のお知らせ\n{日付} {会場}",
  updatedAt: "2026-10-29T00:00:00Z",
  updatedBy: null,
};

const writeText = vi.fn();
let wrapper: VueWrapper | null = null;

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("VITE_RESERVATION_URL", "https://r.example.com");
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
  });
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = "";
  vi.unstubAllEnvs();
});

async function mountDialog() {
  const { default: AnnouncementDialog } = await import("./AnnouncementDialog.vue");
  wrapper = mount(AnnouncementDialog, {
    props: { open: true, event: EVENT },
    attachTo: document.body,
  });
  await flushPromises();
  await new Promise((r) => setTimeout(r, 0));
}

function q(testId: string): HTMLElement | null {
  return document.querySelector(`[data-testid="${testId}"]`);
}

describe("AnnouncementDialog", () => {
  it("Success: 展開済み告知文をプレビューする", async () => {
    fetchMock.mockResolvedValue(ok(TEMPLATE));
    await mountDialog();
    expect(q("announcement-preview")?.textContent).toBe(
      "ゆる練のお知らせ\n11/14(土) 有明会場",
    );
    expect(q("announcement-copy-message")).not.toBeNull();
  });

  it("「告知文をコピー」で展開済み告知文を書き込む", async () => {
    fetchMock.mockResolvedValue(ok(TEMPLATE));
    writeText.mockResolvedValue(undefined);
    await mountDialog();
    q("announcement-copy-message")?.click();
    await flushPromises();
    expect(writeText).toHaveBeenCalledWith("ゆる練のお知らせ\n11/14(土) 有明会場");
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: "告知文をコピーしました" }),
    );
  });

  it("「予約リンクをコピー」で LINE 用予約リンクのみ書き込む", async () => {
    fetchMock.mockResolvedValue(ok(TEMPLATE));
    writeText.mockResolvedValue(undefined);
    await mountDialog();
    q("announcement-copy-booking-link")?.click();
    await flushPromises();
    expect(writeText).toHaveBeenCalledWith(
      "https://r.example.com/events/ev-1?book=1&openExternalBrowser=1",
    );
  });

  it("「紹介ページリンクをコピー」で LP トップのみ書き込む", async () => {
    fetchMock.mockResolvedValue(ok(TEMPLATE));
    writeText.mockResolvedValue(undefined);
    await mountDialog();
    q("announcement-copy-intro-link")?.click();
    await flushPromises();
    expect(writeText).toHaveBeenCalledWith(expect.stringMatching(/^https?:\/\/.+\/$/));
  });

  it("X に切り替えると X のテンプレートで展開し、X 文字数を表示する", async () => {
    fetchMock.mockImplementation(async (channel: string) =>
      channel === "x"
        ? ok({ ...TEMPLATE, channel: "x", body: "あいう {予約リンク}" })
        : ok(TEMPLATE),
    );
    await mountDialog();
    expect(q("announcement-x-length")).toBeNull();
    const xTab = q("announcement-channel-x");
    expect(q("announcement-channel-line")?.getAttribute("aria-selected")).toBe("true");
    xTab?.click();
    await flushPromises();
    expect(xTab?.getAttribute("aria-selected")).toBe("true");
    expect(fetchMock).toHaveBeenLastCalledWith("x");
    expect(q("announcement-preview")?.textContent).toBe(
      "あいう https://r.example.com/events/ev-1?book=1",
    );
    expect(q("announcement-x-length")?.textContent).toContain("X の文字数: 30 / 280");
  });

  it("X で 280 を超えると上限超過の注意を出す", async () => {
    fetchMock.mockImplementation(async (channel: string) =>
      channel === "x"
        ? ok({ ...TEMPLATE, channel: "x", body: "あ".repeat(141) })
        : ok(TEMPLATE),
    );
    await mountDialog();
    q("announcement-channel-x")?.click();
    await flushPromises();
    expect(q("announcement-x-length")?.textContent).toContain("上限を超えています");
    expect(q("announcement-copy-message")).not.toBeNull();
  });

  it("Empty: 未設定メッセージを出し、告知文コピーは無くリンクだけコピーは使える", async () => {
    fetchMock.mockResolvedValue(ok(null));
    await mountDialog();
    expect(q("announcement-empty")?.textContent).toContain("告知テンプレートが未設定です");
    expect(q("announcement-copy-message")).toBeNull();
    expect(q("announcement-copy-booking-link")).not.toBeNull();
    expect(q("announcement-copy-intro-link")).not.toBeNull();
  });

  it("Error: エラーと再試行を出し、再試行で再取得する", async () => {
    fetchMock.mockResolvedValueOnce(err({ code: "NETWORK_ERROR", message: "x" }));
    await mountDialog();
    const error = q("announcement-error");
    expect(error?.textContent).toContain("テンプレートを読み込めませんでした");
    expect(q("announcement-copy-booking-link")).not.toBeNull();
    expect(q("announcement-copy-intro-link")).not.toBeNull();
    fetchMock.mockResolvedValueOnce(ok(TEMPLATE));
    error?.querySelector("button")?.click();
    await flushPromises();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(q("announcement-preview")).not.toBeNull();
  });

  it("書き込み失敗時は退避欄に文面を出す", async () => {
    fetchMock.mockResolvedValue(ok(TEMPLATE));
    writeText.mockRejectedValue(new Error("denied"));
    await mountDialog();
    q("announcement-copy-message")?.click();
    await flushPromises();
    const fallback = q("announcement-fallback") as HTMLTextAreaElement | null;
    expect(fallback?.value).toBe("ゆる練のお知らせ\n11/14(土) 有明会場");
    expect(fallback?.readOnly).toBe(true);
  });

  it("「テンプレートを編集」で選択中チャネルの告知テンプレート画面へ遷移し、閉じる", async () => {
    fetchMock.mockResolvedValue(ok(TEMPLATE));
    await mountDialog();
    q("announcement-channel-x")?.click();
    await flushPromises();
    q("announcement-edit-template")?.click();
    await flushPromises();
    expect(pushMock).toHaveBeenCalledWith({
      name: "announcement-template",
      query: { channel: "x" },
    });
    expect(wrapper?.emitted("update:open")?.[0]).toEqual([false]);
  });
});
