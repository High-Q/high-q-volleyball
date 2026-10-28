import { beforeEach, describe, expect, it, vi } from "vitest";
import { unsafeMemberId } from "@high-q/shared";

/**
 * announcementTemplateQueries の取得 / 保存 + エラー分類テスト。
 * モック方針は entities/venue/api/venueQueries.spec.ts を踏襲する。
 */

const builderResult = {
  data: null as unknown,
  error: null as unknown,
};

function makeBuilder() {
  const builder: Record<string, unknown> = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    single: vi.fn().mockImplementation(async () => ({
      data: builderResult.data,
      error: builderResult.error,
    })),
    maybeSingle: vi.fn().mockImplementation(async () => ({
      data: builderResult.data,
      error: builderResult.error,
    })),
    then: undefined,
  };
  return builder;
}

let currentBuilder = makeBuilder();
const fromMock = vi.fn();

vi.mock("@/shared/api/supabase", () => ({
  getSupabase: () => ({ from: fromMock }),
  _resetSupabaseForTest: () => {},
}));

const ADMIN_ID = "22222222-2222-4222-8222-222222222222";
const ROW = {
  channel: "line",
  body: "{イベント名}のお知らせ",
  updated_at: "2026-10-29T00:00:00Z",
  updated_by: ADMIN_ID,
  created_at: "2026-10-29T00:00:00Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  currentBuilder = makeBuilder();
  fromMock.mockReturnValue(currentBuilder);
  builderResult.data = null;
  builderResult.error = null;
});

describe("fetchAnnouncementTemplate", () => {
  it("channel で 1 行取得し camelCase に変換する", async () => {
    builderResult.data = ROW;
    const { fetchAnnouncementTemplate } = await import("./announcementTemplateQueries");
    const result = await fetchAnnouncementTemplate("line");
    expect(fromMock).toHaveBeenCalledWith("announcement_templates");
    expect(currentBuilder.eq).toHaveBeenCalledWith("channel", "line");
    expect(currentBuilder.maybeSingle).toHaveBeenCalled();
    expect(result).toEqual({
      ok: true,
      value: {
        channel: "line",
        body: "{イベント名}のお知らせ",
        updatedAt: "2026-10-29T00:00:00Z",
        updatedBy: ADMIN_ID,
      },
    });
  });

  it("未登録は ok(null)", async () => {
    builderResult.data = null;
    const { fetchAnnouncementTemplate } = await import("./announcementTemplateQueries");
    const result = await fetchAnnouncementTemplate("line");
    expect(result).toEqual({ ok: true, value: null });
  });

  it("権限エラー (42501) は PERMISSION_DENIED", async () => {
    builderResult.error = { code: "42501", message: "permission denied" };
    const { fetchAnnouncementTemplate } = await import("./announcementTemplateQueries");
    const result = await fetchAnnouncementTemplate("line");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("PERMISSION_DENIED");
  });

  it("通信失敗 (TypeError) は NETWORK_ERROR", async () => {
    currentBuilder.maybeSingle = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    const { fetchAnnouncementTemplate } = await import("./announcementTemplateQueries");
    const result = await fetchAnnouncementTemplate("line");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("NETWORK_ERROR");
  });
});

describe("saveAnnouncementTemplate", () => {
  it("channel をキーに upsert し、保存後の行を返す", async () => {
    builderResult.data = { ...ROW, body: "新しい本文" };
    const { saveAnnouncementTemplate } = await import("./announcementTemplateQueries");
    const result = await saveAnnouncementTemplate(
      "line",
      "新しい本文",
      unsafeMemberId(ADMIN_ID),
    );
    expect(fromMock).toHaveBeenCalledWith("announcement_templates");
    expect(currentBuilder.upsert).toHaveBeenCalledWith(
      { channel: "line", body: "新しい本文", updated_by: ADMIN_ID },
      { onConflict: "channel" },
    );
    expect(currentBuilder.single).toHaveBeenCalled();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.body).toBe("新しい本文");
  });

  it("CHECK 違反 (23514) は INVALID_BODY", async () => {
    builderResult.error = { code: "23514", message: "check constraint" };
    const { saveAnnouncementTemplate } = await import("./announcementTemplateQueries");
    const result = await saveAnnouncementTemplate("line", "", unsafeMemberId(ADMIN_ID));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("INVALID_BODY");
  });

  it("RLS 違反 (42501) は PERMISSION_DENIED", async () => {
    builderResult.error = {
      code: "42501",
      message: "new row violates row-level security policy",
    };
    const { saveAnnouncementTemplate } = await import("./announcementTemplateQueries");
    const result = await saveAnnouncementTemplate("line", "x", unsafeMemberId(ADMIN_ID));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("PERMISSION_DENIED");
  });

  it("その他のエラーは SERVER_ERROR", async () => {
    builderResult.error = { code: "XX000", message: "boom" };
    const { saveAnnouncementTemplate } = await import("./announcementTemplateQueries");
    const result = await saveAnnouncementTemplate("line", "x", unsafeMemberId(ADMIN_ID));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("SERVER_ERROR");
  });
});
