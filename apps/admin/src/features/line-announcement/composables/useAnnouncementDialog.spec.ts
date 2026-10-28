import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import { ok, err, unsafeEventId, unsafeVenueId } from "@high-q/shared";
import type { EventDetailRow } from "@/entities/event-detail";

/**
 * spec: openspec/changes/line-announcement-copy/specs/admin-line-announcement/spec.md
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

const EVENT: EventDetailRow = {
  id: unsafeEventId("ev-1"),
  name: "ゆる練",
  description: null,
  start_at: "2026-11-14T09:00:00Z",
  end_at: "2026-11-14T11:00:00Z",
  venue_id: unsafeVenueId("v-1"),
  venue_name: "有明会場",
  fee: 1000,
  capacity: 24,
  visibility: "published",
  status: "scheduled",
  cancel_deadline: null,
  reserved_count: 0,
  checked_in_count: 0,
  first_time_count: 0,
  waitlist_count: 0,
  reserved_member_count: 0,
  checked_in_member_count: 0,
  vol: 42,
  created_at: "2026-10-01T00:00:00Z",
  updated_at: "2026-10-01T00:00:00Z",
};

const TEMPLATE = {
  channel: "line" as const,
  body: "{イベント名} {回号} {日付} {予約リンク}",
  updatedAt: "2026-10-29T00:00:00Z",
  updatedBy: null,
};

const writeText = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("VITE_RESERVATION_URL", "https://r.example.com");
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

async function setup() {
  const { useAnnouncementDialog } = await import("./useAnnouncementDialog");
  return useAnnouncementDialog(ref(EVENT));
}

describe("useAnnouncementDialog", () => {
  it("load 中は loading、成功で success になり告知文を展開する", async () => {
    let resolve!: (v: unknown) => void;
    fetchMock.mockReturnValue(new Promise((r) => (resolve = r)));
    const d = await setup();
    const p = d.load();
    expect(d.state.value).toBe("loading");
    resolve(ok(TEMPLATE));
    await p;
    expect(fetchMock).toHaveBeenCalledWith("line");
    expect(d.state.value).toBe("success");
    expect(d.message.value).toBe(
      "ゆる練 vol.42 11/14(土) https://r.example.com/events/ev-1?book=1&openExternalBrowser=1",
    );
  });

  it("未登録は empty", async () => {
    fetchMock.mockResolvedValue(ok(null));
    const d = await setup();
    await d.load();
    expect(d.state.value).toBe("empty");
    expect(d.message.value).toBeNull();
  });

  it("取得失敗は error、再読み込みで success に戻れる", async () => {
    fetchMock.mockResolvedValueOnce(err({ code: "NETWORK_ERROR", message: "x" }));
    const d = await setup();
    await d.load();
    expect(d.state.value).toBe("error");
    fetchMock.mockResolvedValueOnce(ok(TEMPLATE));
    await d.load();
    expect(d.state.value).toBe("success");
  });

  it("告知リンクはテンプレートの状態によらず生成される", async () => {
    fetchMock.mockResolvedValue(ok(null));
    const d = await setup();
    await d.load();
    expect(d.bookingLink.value).toBe(
      "https://r.example.com/events/ev-1?book=1&openExternalBrowser=1",
    );
  });

  it("copyMessage 成功で告知文を書き込み成功トースト", async () => {
    fetchMock.mockResolvedValue(ok(TEMPLATE));
    writeText.mockResolvedValue(undefined);
    const d = await setup();
    await d.load();
    await d.copyMessage();
    expect(writeText).toHaveBeenCalledWith(d.message.value);
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: "告知文をコピーしました" }),
    );
    expect(d.fallbackText.value).toBeNull();
  });

  it("copyLink 成功でリンクのみ書き込み成功トースト", async () => {
    fetchMock.mockResolvedValue(ok(null));
    writeText.mockResolvedValue(undefined);
    const d = await setup();
    await d.load();
    await d.copyLink();
    expect(writeText).toHaveBeenCalledWith(d.bookingLink.value);
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: "リンクをコピーしました" }),
    );
  });

  it("書き込み失敗でエラートーストを出し、退避用テキストを設定する", async () => {
    fetchMock.mockResolvedValue(ok(TEMPLATE));
    writeText.mockRejectedValue(new Error("denied"));
    const d = await setup();
    await d.load();
    await d.copyMessage();
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ variant: "destructive" }),
    );
    expect(d.fallbackText.value).toBe(d.message.value);
  });

  it("クリップボード API が無い環境でも退避用テキストを設定する", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: undefined,
      configurable: true,
    });
    fetchMock.mockResolvedValue(ok(null));
    const d = await setup();
    await d.load();
    await d.copyLink();
    expect(d.fallbackText.value).toBe(d.bookingLink.value);
  });
});
