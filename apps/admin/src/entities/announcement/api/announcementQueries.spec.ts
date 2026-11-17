import { beforeEach, describe, expect, it, vi } from "vitest";
import { unsafeAnnouncementId, unsafeMemberId } from "@high-q/shared";
import type { AnnouncementWrite } from "../model/types";

/**
 * announcementQueries の CRUD + エラー分類テスト。
 * モック方針は entities/operational-settings/api/operationalSettingsQueries.spec.ts を踏襲する。
 */

const builderResult = {
  data: null as unknown,
  error: null as unknown,
};

function makeBuilder() {
  const builder: Record<string, unknown> = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockImplementation(async () => ({
      data: builderResult.data,
      error: builderResult.error,
    })),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    single: vi.fn().mockImplementation(async () => ({
      data: builderResult.data,
      error: builderResult.error,
    })),
    // supabase-js の builder は thenable（await で実行）。delete().eq() のように
    // 終端メソッドを挟まない鎖はここで解決される。
    then: (resolve: (v: { data: unknown; error: unknown }) => void) =>
      resolve({ data: builderResult.data, error: builderResult.error }),
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
const ANN_ID = "33333333-3333-4333-8333-333333333333";
const ROW = {
  id: ANN_ID,
  title: "休会のお知らせ",
  body: "本文",
  audience: "all",
  publish_start: "2026-11-18T00:00:00+09:00",
  publish_end: null,
  created_by: ADMIN_ID,
  created_at: "2026-11-18T00:00:00Z",
  updated_at: "2026-11-18T00:00:00Z",
};

const WRITE: AnnouncementWrite = {
  title: "休会のお知らせ",
  body: "本文",
  audience: "all",
  publishStart: "2026-11-18T00:00:00+09:00",
  publishEnd: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  currentBuilder = makeBuilder();
  fromMock.mockReturnValue(currentBuilder);
  builderResult.data = null;
  builderResult.error = null;
});

describe("fetchAnnouncements", () => {
  it("掲載開始の降順で取得し camelCase に変換する", async () => {
    builderResult.data = [ROW];
    const { fetchAnnouncements } = await import("./announcementQueries");
    const result = await fetchAnnouncements();
    expect(fromMock).toHaveBeenCalledWith("announcements");
    expect(currentBuilder.order).toHaveBeenCalledWith("publish_start", { ascending: false });
    expect(result).toEqual({
      ok: true,
      value: [
        {
          id: unsafeAnnouncementId(ANN_ID),
          title: "休会のお知らせ",
          body: "本文",
          audience: "all",
          publishStart: "2026-11-18T00:00:00+09:00",
          publishEnd: null,
          createdBy: unsafeMemberId(ADMIN_ID),
          createdAt: "2026-11-18T00:00:00Z",
          updatedAt: "2026-11-18T00:00:00Z",
        },
      ],
    });
  });

  it("空配列なら ok([])", async () => {
    builderResult.data = [];
    const { fetchAnnouncements } = await import("./announcementQueries");
    const result = await fetchAnnouncements();
    expect(result).toEqual({ ok: true, value: [] });
  });

  it("権限エラー(42501)は PERMISSION_DENIED", async () => {
    builderResult.error = { code: "42501", message: "permission denied" };
    const { fetchAnnouncements } = await import("./announcementQueries");
    const result = await fetchAnnouncements();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("PERMISSION_DENIED");
  });
});

describe("createAnnouncement", () => {
  it("作成者つきで INSERT し camelCase を返す", async () => {
    builderResult.data = ROW;
    const { createAnnouncement } = await import("./announcementQueries");
    const result = await createAnnouncement(WRITE, unsafeMemberId(ADMIN_ID));
    expect(fromMock).toHaveBeenCalledWith("announcements");
    expect(currentBuilder.insert).toHaveBeenCalledWith({
      title: "休会のお知らせ",
      body: "本文",
      audience: "all",
      publish_start: "2026-11-18T00:00:00+09:00",
      publish_end: null,
      created_by: ADMIN_ID,
    });
    expect(result.ok).toBe(true);
  });

  it("CHECK 違反(23514)は VALIDATION", async () => {
    builderResult.error = { code: "23514", message: "violates check constraint" };
    const { createAnnouncement } = await import("./announcementQueries");
    const result = await createAnnouncement(WRITE, unsafeMemberId(ADMIN_ID));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("VALIDATION");
  });
});

describe("updateAnnouncement", () => {
  it("id で UPDATE する", async () => {
    builderResult.data = ROW;
    const { updateAnnouncement } = await import("./announcementQueries");
    const result = await updateAnnouncement(unsafeAnnouncementId(ANN_ID), WRITE);
    expect(currentBuilder.update).toHaveBeenCalledWith({
      title: "休会のお知らせ",
      body: "本文",
      audience: "all",
      publish_start: "2026-11-18T00:00:00+09:00",
      publish_end: null,
    });
    expect(currentBuilder.eq).toHaveBeenCalledWith("id", ANN_ID);
    expect(result.ok).toBe(true);
  });
});

describe("deleteAnnouncement", () => {
  it("id で DELETE する", async () => {
    const { deleteAnnouncement } = await import("./announcementQueries");
    const result = await deleteAnnouncement(unsafeAnnouncementId(ANN_ID));
    expect(currentBuilder.delete).toHaveBeenCalled();
    expect(currentBuilder.eq).toHaveBeenCalledWith("id", ANN_ID);
    expect(result).toEqual({ ok: true, value: undefined });
  });

  it("ネットワークエラー(TypeError)は NETWORK_ERROR", async () => {
    currentBuilder.delete = vi.fn(() => {
      throw new TypeError("fetch failed");
    });
    const { deleteAnnouncement } = await import("./announcementQueries");
    const result = await deleteAnnouncement(unsafeAnnouncementId(ANN_ID));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("NETWORK_ERROR");
  });
});
