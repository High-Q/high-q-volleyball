import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import { err, ok, unsafeMemberId } from "@high-q/shared";
import { DEFAULT_LINE_TEMPLATE } from "@/entities/announcement-template";

/**
 * spec: openspec/changes/line-announcement-copy/specs/admin-line-announcement/spec.md
 *   「告知テンプレート画面」
 */

const { fetchMock, saveMock } = vi.hoisted(() => ({
  fetchMock: vi.fn(),
  saveMock: vi.fn(),
}));
vi.mock("@/entities/announcement-template", async () => {
  const actual = await vi.importActual<typeof import("@/entities/announcement-template")>(
    "@/entities/announcement-template",
  );
  return {
    ...actual,
    fetchAnnouncementTemplate: fetchMock,
    saveAnnouncementTemplate: saveMock,
  };
});

const { toastMock } = vi.hoisted(() => ({ toastMock: vi.fn() }));
vi.mock("@/shared/ui/useToast", () => ({
  useToast: () => ({ toast: toastMock }),
}));

const ADMIN = unsafeMemberId("22222222-2222-4222-8222-222222222222");
const TEMPLATE = {
  channel: "line" as const,
  body: "{イベント名}のお知らせ",
  updatedAt: "2026-10-29T00:00:00Z",
  updatedBy: ADMIN,
};

beforeEach(() => {
  vi.clearAllMocks();
});

async function setup(admin = ADMIN as typeof ADMIN | null) {
  const { useAnnouncementTemplateForm } = await import("./useAnnouncementTemplateForm");
  const form = useAnnouncementTemplateForm(ref(admin));
  await form.load();
  return form;
}

describe("useAnnouncementTemplateForm — 読み込み", () => {
  it("登録済みテンプレートを本文に入れ、ready になる", async () => {
    fetchMock.mockResolvedValue(ok(TEMPLATE));
    const form = await setup();
    expect(form.status.value).toBe("ready");
    expect(form.isNew.value).toBe(false);
    expect(form.body.value).toBe("{イベント名}のお知らせ");
    expect(form.updatedAt.value).toBe("2026-10-29T00:00:00Z");
  });

  it("未登録なら初期テンプレートを入れ、isNew になる", async () => {
    fetchMock.mockResolvedValue(ok(null));
    const form = await setup();
    expect(form.status.value).toBe("ready");
    expect(form.isNew.value).toBe(true);
    expect(form.body.value).toBe(DEFAULT_LINE_TEMPLATE);
    expect(form.updatedAt.value).toBeNull();
  });

  it("取得失敗は error", async () => {
    fetchMock.mockResolvedValue(err({ code: "NETWORK_ERROR", message: "x" }));
    const form = await setup();
    expect(form.status.value).toBe("error");
  });
});

describe("useAnnouncementTemplateForm — 入力チェック", () => {
  beforeEach(() => {
    fetchMock.mockResolvedValue(ok(TEMPLATE));
  });

  it("初期表示ではエラーを出さない", async () => {
    const form = await setup();
    expect(form.bodyError.value).toBeNull();
  });

  it("空にすると必須エラー、保存は呼ばれない", async () => {
    const form = await setup();
    form.body.value = "";
    expect(form.bodyError.value).toBe("本文を入力してください。");
    expect(await form.save()).toBe(false);
    expect(saveMock).not.toHaveBeenCalled();
  });

  it("5,000 文字を超えると上限エラー、保存は呼ばれない", async () => {
    const form = await setup();
    form.body.value = "あ".repeat(5001);
    expect(form.remaining.value).toBe(-1);
    expect(form.bodyError.value).toBe("5,000 文字以内で入力してください。");
    expect(await form.save()).toBe(false);
    expect(saveMock).not.toHaveBeenCalled();
  });

  it("残り文字数を返す", async () => {
    const form = await setup();
    form.body.value = "abc";
    expect(form.remaining.value).toBe(4997);
  });

  it("知らない差し込み項目を列挙する（保存は妨げない）", async () => {
    const form = await setup();
    form.body.value = "{集合時刻} {会場}";
    expect(form.unknownPlaceholders.value).toEqual(["{集合時刻}"]);
    expect(form.bodyError.value).toBeNull();
  });

  it("プレビューはサンプル値で展開される", async () => {
    const form = await setup();
    form.body.value = "{会場} {参加費}";
    expect(form.preview.value).toBe("有明会場 1,000円");
  });
});

describe("useAnnouncementTemplateForm — 保存", () => {
  beforeEach(() => {
    fetchMock.mockResolvedValue(ok(TEMPLATE));
  });

  it("成功で保存 API を呼び、トーストと最終更新日時を更新する", async () => {
    saveMock.mockResolvedValue(
      ok({ ...TEMPLATE, body: "新本文", updatedAt: "2026-10-30T00:00:00Z" }),
    );
    const form = await setup();
    form.body.value = "新本文";
    expect(await form.save()).toBe(true);
    expect(saveMock).toHaveBeenCalledWith("line", "新本文", ADMIN);
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: "告知テンプレートを保存しました" }),
    );
    expect(form.updatedAt.value).toBe("2026-10-30T00:00:00Z");
    expect(form.isNew.value).toBe(false);
    expect(form.saving.value).toBe(false);
  });

  it("失敗でエラートーストを出し、入力内容を保持する", async () => {
    saveMock.mockResolvedValue(err({ code: "NETWORK_ERROR", message: "x" }));
    const form = await setup();
    form.body.value = "編集中の本文";
    expect(await form.save()).toBe(false);
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "保存できませんでした",
        variant: "destructive",
      }),
    );
    expect(form.body.value).toBe("編集中の本文");
    expect(form.saving.value).toBe(false);
  });

  it("管理者 ID が取れないときは保存せずエラートースト", async () => {
    const form = await setup(null);
    expect(await form.save()).toBe(false);
    expect(saveMock).not.toHaveBeenCalled();
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ variant: "destructive" }),
    );
  });
});
