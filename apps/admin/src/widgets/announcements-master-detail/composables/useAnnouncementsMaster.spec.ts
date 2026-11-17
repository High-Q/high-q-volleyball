import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import type { MemberId } from "@high-q/shared";

/**
 * 関連:
 *   openspec/changes/general-announcements/specs/admin-announcements/spec.md
 */

const { fetchMock, createMock, updateMock, deleteMock } = vi.hoisted(() => ({
  fetchMock: vi.fn(),
  createMock: vi.fn(),
  updateMock: vi.fn(),
  deleteMock: vi.fn(),
}));

vi.mock("@/entities/announcement", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/entities/announcement")>();
  return {
    ...actual,
    fetchAnnouncements: fetchMock,
    createAnnouncement: createMock,
    updateAnnouncement: updateMock,
    deleteAnnouncement: deleteMock,
  };
});

import { useAnnouncementsMaster, NEW_ID } from "./useAnnouncementsMaster";
import type { Announcement } from "@/entities/announcement";

const ADMIN = ref<MemberId | null>(
  "22222222-2222-4222-8222-222222222222" as unknown as MemberId,
);

function ann(over: Partial<Announcement>): Announcement {
  return {
    id: "a-1" as unknown as Announcement["id"],
    title: "お知らせ1",
    body: "本文",
    audience: "all",
    publishStart: "2020-01-01T00:00:00+09:00",
    publishEnd: null,
    createdBy: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...over,
  };
}

const LIST: Announcement[] = [
  ann({ id: "a-1" as unknown as Announcement["id"], title: "掲載中のお知らせ", audience: "all" }),
  ann({
    id: "a-2" as unknown as Announcement["id"],
    title: "予定のお知らせ",
    audience: "public",
    publishStart: "2999-01-01T00:00:00+09:00",
  }),
];

beforeEach(() => {
  vi.clearAllMocks();
  fetchMock.mockResolvedValue({ ok: true, value: LIST.map((a) => ({ ...a })) });
  vi.spyOn(window, "confirm").mockReturnValue(true);
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("useAnnouncementsMaster — 読込と掲載状態", () => {
  it("reload で一覧取得し先頭を選択、掲載状態を導出する", async () => {
    const m = useAnnouncementsMaster(ADMIN);
    await m.reload();
    expect(m.items.value).toHaveLength(2);
    expect(m.items.value[0]?.statusLabel).toBe("掲載中");
    expect(m.items.value[1]?.statusLabel).toBe("掲載予定");
    expect(m.selId.value).toBe("a-1");
  });

  it("取得失敗時は loadErrorCode を立てる", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, error: { code: "SERVER_ERROR", message: "x" } });
    const m = useAnnouncementsMaster(ADMIN);
    await m.reload();
    expect(m.loadErrorCode.value).toBe("SERVER_ERROR");
  });
});

describe("useAnnouncementsMaster — 作成", () => {
  it("addAnnouncement で未保存の新規行が先頭に出る", async () => {
    const m = useAnnouncementsMaster(ADMIN);
    await m.reload();
    m.addAnnouncement();
    expect(m.selId.value).toBe(NEW_ID);
    expect(m.items.value[0]?.id).toBe(NEW_ID);
  });

  it("audience 未選択だと save で createAnnouncement を呼ばない", async () => {
    const m = useAnnouncementsMaster(ADMIN);
    await m.reload();
    m.addAnnouncement();
    m.setField("title", "新タイトル");
    m.setField("body", "新本文");
    await m.save();
    expect(createMock).not.toHaveBeenCalled();
    expect(m.displayErrors.value.audience).toBeDefined();
  });

  it("必須を満たせば createAnnouncement を作成者つきで呼ぶ", async () => {
    createMock.mockResolvedValue({ ok: true, value: ann({ id: "a-9" as unknown as Announcement["id"] }) });
    const m = useAnnouncementsMaster(ADMIN);
    await m.reload();
    m.addAnnouncement();
    m.setField("title", "新タイトル");
    m.setField("body", "新本文");
    m.setField("audience", "members");
    await m.save();
    expect(createMock).toHaveBeenCalledTimes(1);
    const [write, createdBy] = createMock.mock.calls[0] ?? [];
    expect(write).toMatchObject({ title: "新タイトル", body: "新本文", audience: "members", publishEnd: null });
    expect(createdBy).toBe(ADMIN.value);
  });
});

describe("useAnnouncementsMaster — 削除", () => {
  it("保存済みは requestDelete で確認ダイアログを開く", async () => {
    const m = useAnnouncementsMaster(ADMIN);
    await m.reload();
    m.requestDelete();
    expect(m.deleteOpen.value).toBe(true);
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it("confirmDelete で deleteAnnouncement を呼び一覧を再読込する", async () => {
    deleteMock.mockResolvedValue({ ok: true, value: undefined });
    const m = useAnnouncementsMaster(ADMIN);
    await m.reload();
    m.requestDelete();
    await m.confirmDelete();
    expect(deleteMock).toHaveBeenCalledTimes(1);
    expect(m.deleteOpen.value).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("未保存の新規は requestDelete で DB を触らず破棄する", async () => {
    const m = useAnnouncementsMaster(ADMIN);
    await m.reload();
    m.addAnnouncement();
    m.requestDelete();
    expect(deleteMock).not.toHaveBeenCalled();
    expect(m.deleteOpen.value).toBe(false);
    expect(m.selId.value).toBe("a-1");
  });
});
