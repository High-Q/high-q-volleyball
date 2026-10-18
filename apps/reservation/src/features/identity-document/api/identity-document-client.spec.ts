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
  insertResult,
}: {
  insertResult?: ReturnType<typeof vi.fn>;
} = {}) {
  return {
    insert: insertResult ?? vi.fn().mockResolvedValue({ error: null }),
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

describe("insertRecord", () => {
  it("実パス確定済みで identity_documents に 1 回だけ INSERT する (placeholder を使わない)", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    supabaseMock.from.mockReturnValue(buildFromMock({ insertResult: insert }));

    const { insertRecord } = await import("./identity-document-client");
    await insertRecord({
      id: DOC_ID,
      memberId: MEMBER_ID,
      documentType: "drivers_license",
      frontPath: `${MEMBER_ID}/${DOC_ID}-front.jpg`,
      backPath: `${MEMBER_ID}/${DOC_ID}-back.jpg`,
    });

    expect(supabaseMock.from).toHaveBeenCalledWith("identity_documents");
    expect(supabaseMock.from).toHaveBeenCalledTimes(1);
    expect(insert).toHaveBeenCalledTimes(1);
    expect(insert).toHaveBeenCalledWith({
      id: DOC_ID,
      member_id: MEMBER_ID,
      document_type: "drivers_license",
      storage_path_front: `${MEMBER_ID}/${DOC_ID}-front.jpg`,
      storage_path_back: `${MEMBER_ID}/${DOC_ID}-back.jpg`,
      status: "pending",
    });
  });

  it("back なしの場合 storage_path_back を null で INSERT する", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    supabaseMock.from.mockReturnValue(buildFromMock({ insertResult: insert }));

    const { insertRecord } = await import("./identity-document-client");
    await insertRecord({
      id: DOC_ID,
      memberId: MEMBER_ID,
      documentType: "drivers_license",
      frontPath: `${MEMBER_ID}/${DOC_ID}-front.jpg`,
    });

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        storage_path_front: `${MEMBER_ID}/${DOC_ID}-front.jpg`,
        storage_path_back: null,
      }),
    );
  });

  it("INSERT する storage_path は placeholder 文字列を含まない (再発防止)", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    supabaseMock.from.mockReturnValue(buildFromMock({ insertResult: insert }));

    const { insertRecord } = await import("./identity-document-client");
    await insertRecord({
      id: DOC_ID,
      memberId: MEMBER_ID,
      documentType: "drivers_license",
      frontPath: `${MEMBER_ID}/${DOC_ID}-front.jpg`,
      backPath: `${MEMBER_ID}/${DOC_ID}-back.jpg`,
    });

    const payload = insert.mock.calls[0]![0] as Record<string, unknown>;
    expect(payload.storage_path_front).not.toContain("__pending__");
    expect(payload.storage_path_back).not.toContain("__pending__");
  });

  it("DB エラー時は throw する", async () => {
    const insert = vi
      .fn()
      .mockResolvedValue({ error: { message: "boom" } });
    supabaseMock.from.mockReturnValue(buildFromMock({ insertResult: insert }));

    const { insertRecord } = await import("./identity-document-client");
    await expect(
      insertRecord({
        id: DOC_ID,
        memberId: MEMBER_ID,
        documentType: "drivers_license",
        frontPath: `${MEMBER_ID}/${DOC_ID}-front.jpg`,
      }),
    ).rejects.toMatchObject({ message: "boom" });
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
