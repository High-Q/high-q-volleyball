import { beforeEach, describe, expect, it, vi } from "vitest";

const supabaseMock = {
  from: vi.fn(),
  storage: { from: vi.fn() },
};

vi.mock("@/shared/api/supabase", () => ({
  getSupabase: () => supabaseMock,
}));

const MEMBER_ID = "11111111-1111-4111-8111-111111111111";
const DOC_ID = "22222222-2222-4222-8222-222222222222";

function buildFromMock({
  insertSingle,
  updateEqResult,
  deleteEqResult,
}: {
  insertSingle?: ReturnType<typeof vi.fn>;
  updateEqResult?: ReturnType<typeof vi.fn>;
  deleteEqResult?: ReturnType<typeof vi.fn>;
} = {}) {
  return {
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: insertSingle ?? vi.fn(),
      })),
    })),
    update: vi.fn(() => ({ eq: updateEqResult ?? vi.fn() })),
    delete: vi.fn(() => ({ eq: deleteEqResult ?? vi.fn() })),
  };
}

function buildStorageMock({
  upload,
  remove,
}: {
  upload?: ReturnType<typeof vi.fn>;
  remove?: ReturnType<typeof vi.fn>;
} = {}) {
  return {
    upload: upload ?? vi.fn(),
    remove: remove ?? vi.fn(),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("buildStoragePath", () => {
  it("front パスを正規化する (大文字拡張子は小文字へ)", async () => {
    const { buildStoragePath } = await import("./identity-document-client");

    expect(
      buildStoragePath(MEMBER_ID, DOC_ID, "front", "image/jpeg"),
    ).toBe(`${MEMBER_ID}/${DOC_ID}-front.jpg`);
  });

  it("back パスを構築する", async () => {
    const { buildStoragePath } = await import("./identity-document-client");

    expect(buildStoragePath(MEMBER_ID, DOC_ID, "back", "image/png")).toBe(
      `${MEMBER_ID}/${DOC_ID}-back.png`,
    );
  });

  it("heic / heif は jpg にフォールバック (heic2any 経由で渡される想定)", async () => {
    const { buildStoragePath } = await import("./identity-document-client");

    expect(
      buildStoragePath(MEMBER_ID, DOC_ID, "front", "image/heic"),
    ).toBe(`${MEMBER_ID}/${DOC_ID}-front.jpg`);
    expect(
      buildStoragePath(MEMBER_ID, DOC_ID, "front", "image/heif"),
    ).toBe(`${MEMBER_ID}/${DOC_ID}-front.jpg`);
  });
});

describe("insertPendingRecord", () => {
  it("identity_documents に行を INSERT し新規 ID を返す (storage_path_front は placeholder)", async () => {
    const insertSingle = vi
      .fn()
      .mockResolvedValue({ data: { id: DOC_ID }, error: null });
    supabaseMock.from.mockReturnValue(buildFromMock({ insertSingle }));

    const { insertPendingRecord } = await import("./identity-document-client");
    const id = await insertPendingRecord(MEMBER_ID, "drivers_license");

    expect(id).toBe(DOC_ID);
    expect(supabaseMock.from).toHaveBeenCalledWith("identity_documents");
  });

  it("DB エラー時は throw する", async () => {
    const insertSingle = vi
      .fn()
      .mockResolvedValue({ data: null, error: { message: "boom" } });
    supabaseMock.from.mockReturnValue(buildFromMock({ insertSingle }));

    const { insertPendingRecord } = await import("./identity-document-client");
    await expect(
      insertPendingRecord(MEMBER_ID, "drivers_license"),
    ).rejects.toMatchObject({ message: "boom" });
  });
});

describe("uploadFileToStorage", () => {
  it("Storage バケット identity-documents にファイルを upload する", async () => {
    const upload = vi.fn().mockResolvedValue({ data: {}, error: null });
    supabaseMock.storage.from.mockReturnValue(buildStorageMock({ upload }));

    const { uploadFileToStorage } = await import("./identity-document-client");
    const file = new File([""], "front.jpg", { type: "image/jpeg" });
    const path = `${MEMBER_ID}/${DOC_ID}-front.jpg`;
    await uploadFileToStorage(path, file);

    expect(supabaseMock.storage.from).toHaveBeenCalledWith("identity-documents");
    expect(upload).toHaveBeenCalledWith(path, file, {
      contentType: "image/jpeg",
      upsert: false,
    });
  });

  it("upload エラー時は throw する", async () => {
    const upload = vi
      .fn()
      .mockResolvedValue({ data: null, error: { message: "storage down" } });
    supabaseMock.storage.from.mockReturnValue(buildStorageMock({ upload }));

    const { uploadFileToStorage } = await import("./identity-document-client");
    const file = new File([""], "f.jpg", { type: "image/jpeg" });
    await expect(
      uploadFileToStorage(`${MEMBER_ID}/x-front.jpg`, file),
    ).rejects.toMatchObject({ message: "storage down" });
  });
});

describe("confirmStoragePaths", () => {
  it("storage_path_front / storage_path_back を UPDATE する (back あり)", async () => {
    const updateEq = vi.fn().mockResolvedValue({ data: {}, error: null });
    supabaseMock.from.mockReturnValue(buildFromMock({ updateEqResult: updateEq }));

    const { confirmStoragePaths } = await import("./identity-document-client");
    await confirmStoragePaths(DOC_ID, {
      front: `${MEMBER_ID}/${DOC_ID}-front.jpg`,
      back: `${MEMBER_ID}/${DOC_ID}-back.jpg`,
    });

    const fromCall = supabaseMock.from.mock.results[0]!
      .value as ReturnType<typeof buildFromMock>;
    expect(fromCall.update).toHaveBeenCalledWith({
      storage_path_front: `${MEMBER_ID}/${DOC_ID}-front.jpg`,
      storage_path_back: `${MEMBER_ID}/${DOC_ID}-back.jpg`,
    });
  });

  it("back なしの場合 storage_path_back を null で UPDATE する", async () => {
    const updateEq = vi.fn().mockResolvedValue({ data: {}, error: null });
    supabaseMock.from.mockReturnValue(buildFromMock({ updateEqResult: updateEq }));

    const { confirmStoragePaths } = await import("./identity-document-client");
    await confirmStoragePaths(DOC_ID, {
      front: `${MEMBER_ID}/${DOC_ID}-front.jpg`,
    });

    const fromCall = supabaseMock.from.mock.results[0]!
      .value as ReturnType<typeof buildFromMock>;
    expect(fromCall.update).toHaveBeenCalledWith({
      storage_path_front: `${MEMBER_ID}/${DOC_ID}-front.jpg`,
      storage_path_back: null,
    });
  });

  it("UPDATE エラーは throw する", async () => {
    const updateEq = vi
      .fn()
      .mockResolvedValue({ data: null, error: { message: "update fail" } });
    supabaseMock.from.mockReturnValue(buildFromMock({ updateEqResult: updateEq }));

    const { confirmStoragePaths } = await import("./identity-document-client");
    await expect(
      confirmStoragePaths(DOC_ID, { front: "x" }),
    ).rejects.toMatchObject({ message: "update fail" });
  });
});

describe("rollbackRecord", () => {
  it("identity_documents 行を削除する", async () => {
    const deleteEq = vi.fn().mockResolvedValue({ data: {}, error: null });
    supabaseMock.from.mockReturnValue(buildFromMock({ deleteEqResult: deleteEq }));

    const { rollbackRecord } = await import("./identity-document-client");
    await rollbackRecord(DOC_ID);

    expect(supabaseMock.from).toHaveBeenCalledWith("identity_documents");
  });

  it("DELETE エラー時もユーザー表示用に静かに飲み込む (best-effort)", async () => {
    const deleteEq = vi
      .fn()
      .mockResolvedValue({ data: null, error: { message: "delete fail" } });
    supabaseMock.from.mockReturnValue(buildFromMock({ deleteEqResult: deleteEq }));

    const { rollbackRecord } = await import("./identity-document-client");
    // ロールバック自体の失敗は呼び出し側 (composable) で別途ログ、UI には伝えない
    await expect(rollbackRecord(DOC_ID)).resolves.toBeUndefined();
  });
});

describe("removeStorageObjects", () => {
  it("Storage オブジェクトを一括削除する (best-effort)", async () => {
    const remove = vi.fn().mockResolvedValue({ data: [], error: null });
    supabaseMock.storage.from.mockReturnValue(buildStorageMock({ remove }));

    const { removeStorageObjects } = await import("./identity-document-client");
    await removeStorageObjects([
      `${MEMBER_ID}/${DOC_ID}-front.jpg`,
      `${MEMBER_ID}/${DOC_ID}-back.jpg`,
    ]);

    expect(supabaseMock.storage.from).toHaveBeenCalledWith("identity-documents");
    expect(remove).toHaveBeenCalledWith([
      `${MEMBER_ID}/${DOC_ID}-front.jpg`,
      `${MEMBER_ID}/${DOC_ID}-back.jpg`,
    ]);
  });

  it("空配列の場合は API を呼ばずに即 resolve", async () => {
    const remove = vi.fn();
    supabaseMock.storage.from.mockReturnValue(buildStorageMock({ remove }));

    const { removeStorageObjects } = await import("./identity-document-client");
    await removeStorageObjects([]);

    expect(remove).not.toHaveBeenCalled();
  });
});
