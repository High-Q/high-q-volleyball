import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const apiMock = {
  insertPendingRecord: vi.fn(),
  uploadFileToStorage: vi.fn(),
  confirmStoragePaths: vi.fn(),
  rollbackRecord: vi.fn(),
  removeStorageObjects: vi.fn(),
  buildStoragePath: vi.fn(),
};

vi.mock("../api/identity-document-client", () => apiMock);

const convertMock = vi.fn<(f: File) => Promise<File>>(async (f) => f);
const isHeicMock = vi.fn<(f: File) => boolean>(() => false);
vi.mock("../lib/convertHeicToJpeg", () => ({
  convertHeicToJpeg: (f: File) => convertMock(f),
  isHeicFile: (f: File) => isHeicMock(f),
}));

const sessionState = {
  session: { value: { user: { id: "uid-001" } } },
  refresh: vi.fn(async () => undefined),
};
vi.mock("@/features/auth", () => ({
  useAuthSession: () => sessionState,
}));

const MEMBER_ID = "uid-001";
const DOC_ID = "doc-1";
const PATH_FRONT = `${MEMBER_ID}/${DOC_ID}-front.jpg`;
const PATH_BACK = `${MEMBER_ID}/${DOC_ID}-back.jpg`;

function makeJpeg(name = "id.jpg", sizeBytes = 1024) {
  const data = new Uint8Array(sizeBytes);
  return new File([data], name, { type: "image/jpeg" });
}

beforeEach(() => {
  vi.clearAllMocks();
  isHeicMock.mockReturnValue(false);
  convertMock.mockImplementation(async (f) => f);
  apiMock.buildStoragePath.mockImplementation(
    (mid: string, did: string, side: "front" | "back") =>
      `${mid}/${did}-${side}.jpg`,
  );
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("useUploadIdentityDocument — 初期状態", () => {
  it("pageState='empty'、両スロット empty、未選択", async () => {
    const { useUploadIdentityDocument } = await import(
      "./useUploadIdentityDocument"
    );
    const c = useUploadIdentityDocument();
    expect(c.pageState.value).toBe("empty");
    expect(c.frontSlot.value.state).toBe("empty");
    expect(c.backSlot.value.state).toBe("empty");
    expect(c.selectedDocumentType.value).toBeNull();
    expect(c.consented.value).toBe(false);
  });
});

describe("selectDocumentType", () => {
  it("書類を選択すると pageState='selecting' になる", async () => {
    const { useUploadIdentityDocument } = await import(
      "./useUploadIdentityDocument"
    );
    const c = useUploadIdentityDocument();
    c.selectDocumentType("drivers_license");
    expect(c.selectedDocumentType.value).toBe("drivers_license");
    expect(c.pageState.value).toBe("selecting");
  });

  it("書類を切り替えると両スロットと同意状態がリセットされる", async () => {
    const { useUploadIdentityDocument } = await import(
      "./useUploadIdentityDocument"
    );
    const c = useUploadIdentityDocument();
    c.selectDocumentType("my_number_card_masked");
    c.toggleConsent(true);
    await c.selectFile("front", makeJpeg());
    c.selectDocumentType("drivers_license");
    expect(c.frontSlot.value.state).toBe("empty");
    expect(c.consented.value).toBe(false);
  });
});

describe("selectFile — バリデーション", () => {
  it("MIME 不正 (gif) は state='error' / unsupported_format", async () => {
    const { useUploadIdentityDocument } = await import(
      "./useUploadIdentityDocument"
    );
    const c = useUploadIdentityDocument();
    c.selectDocumentType("drivers_license");
    const gif = new File([new Uint8Array(10)], "id.gif", { type: "image/gif" });
    await c.selectFile("front", gif);
    expect(c.frontSlot.value.state).toBe("error");
    expect(c.error.value).toBe("unsupported_format");
  });

  it("拡張子不正 (pdf) は unsupported_format", async () => {
    const { useUploadIdentityDocument } = await import(
      "./useUploadIdentityDocument"
    );
    const c = useUploadIdentityDocument();
    c.selectDocumentType("drivers_license");
    const pdf = new File([new Uint8Array(10)], "id.pdf", {
      type: "application/pdf",
    });
    await c.selectFile("front", pdf);
    expect(c.error.value).toBe("unsupported_format");
  });

  it("10MB 超は file_too_large", async () => {
    const { useUploadIdentityDocument } = await import(
      "./useUploadIdentityDocument"
    );
    const c = useUploadIdentityDocument();
    c.selectDocumentType("drivers_license");
    const big = makeJpeg("big.jpg", 11 * 1024 * 1024);
    await c.selectFile("front", big);
    expect(c.frontSlot.value.state).toBe("error");
    expect(c.error.value).toBe("file_too_large");
  });

  it("正常 jpg は state='ready' に遷移、file が保持される", async () => {
    const { useUploadIdentityDocument } = await import(
      "./useUploadIdentityDocument"
    );
    const c = useUploadIdentityDocument();
    c.selectDocumentType("drivers_license");
    const file = makeJpeg();
    await c.selectFile("front", file);
    expect(c.frontSlot.value.state).toBe("ready");
    expect(c.frontSlot.value.file).toBe(file);
    expect(c.error.value).toBeNull();
  });

  it("heic ファイルは jpeg に変換されてから ready 遷移", async () => {
    const { useUploadIdentityDocument } = await import(
      "./useUploadIdentityDocument"
    );
    isHeicMock.mockReturnValue(true);
    const converted = makeJpeg("id.jpg");
    convertMock.mockResolvedValue(converted);
    const c = useUploadIdentityDocument();
    c.selectDocumentType("drivers_license");
    const heic = new File([new Uint8Array(10)], "id.HEIC", {
      type: "image/heic",
    });
    await c.selectFile("front", heic);
    expect(convertMock).toHaveBeenCalledWith(heic);
    expect(c.frontSlot.value.file).toBe(converted);
    expect(c.frontSlot.value.state).toBe("ready");
  });

  it("変換後にサイズ超過で file_too_large", async () => {
    const { useUploadIdentityDocument } = await import(
      "./useUploadIdentityDocument"
    );
    isHeicMock.mockReturnValue(true);
    convertMock.mockResolvedValue(makeJpeg("big.jpg", 11 * 1024 * 1024));
    const c = useUploadIdentityDocument();
    c.selectDocumentType("drivers_license");
    const heic = new File([new Uint8Array(10)], "x.HEIC", {
      type: "image/heic",
    });
    await c.selectFile("front", heic);
    expect(c.error.value).toBe("file_too_large");
  });

  it("heic 変換失敗時は unsupported_format", async () => {
    const { useUploadIdentityDocument } = await import(
      "./useUploadIdentityDocument"
    );
    isHeicMock.mockReturnValue(true);
    convertMock.mockRejectedValue(new Error("decode failed"));
    const c = useUploadIdentityDocument();
    c.selectDocumentType("drivers_license");
    const heic = new File([new Uint8Array(10)], "x.heic", {
      type: "image/heic",
    });
    await c.selectFile("front", heic);
    expect(c.error.value).toBe("unsupported_format");
  });

  it("片方のスロット error が他方に影響しない", async () => {
    const { useUploadIdentityDocument } = await import(
      "./useUploadIdentityDocument"
    );
    const c = useUploadIdentityDocument();
    c.selectDocumentType("drivers_license");
    await c.selectFile("front", makeJpeg("front.jpg"));
    const gif = new File([new Uint8Array(10)], "back.gif", {
      type: "image/gif",
    });
    await c.selectFile("back", gif);
    expect(c.frontSlot.value.state).toBe("ready");
    expect(c.backSlot.value.state).toBe("error");
  });
});

describe("removeFile", () => {
  it("スロットを empty に戻す", async () => {
    const { useUploadIdentityDocument } = await import(
      "./useUploadIdentityDocument"
    );
    const c = useUploadIdentityDocument();
    c.selectDocumentType("drivers_license");
    await c.selectFile("front", makeJpeg());
    c.removeFile("front");
    expect(c.frontSlot.value.state).toBe("empty");
    expect(c.frontSlot.value.file).toBeNull();
  });
});

describe("submit — 業務ガード", () => {
  it("表面未選択は { ok:false, error:'front_required' }", async () => {
    const { useUploadIdentityDocument } = await import(
      "./useUploadIdentityDocument"
    );
    const c = useUploadIdentityDocument();
    c.selectDocumentType("drivers_license");
    const r = await c.submit();
    expect(r).toEqual({ ok: false, error: "front_required" });
  });

  it("マイナンバー + 同意なしは { ok:false, error:'consent_required' }", async () => {
    const { useUploadIdentityDocument } = await import(
      "./useUploadIdentityDocument"
    );
    const c = useUploadIdentityDocument();
    c.selectDocumentType("my_number_card_masked");
    await c.selectFile("front", makeJpeg());
    const r = await c.submit();
    expect(r).toEqual({ ok: false, error: "consent_required" });
  });

  it("在留カード + 表面のみ (裏面なし) は { ok:false, error:'back_required' }", async () => {
    const { useUploadIdentityDocument } = await import(
      "./useUploadIdentityDocument"
    );
    const c = useUploadIdentityDocument();
    c.selectDocumentType("residence_card");
    await c.selectFile("front", makeJpeg("front.jpg"));
    const r = await c.submit();
    expect(r).toEqual({ ok: false, error: "back_required" });
  });

  it("特別永住者証明書 + 表面のみ → back_required", async () => {
    const { useUploadIdentityDocument } = await import(
      "./useUploadIdentityDocument"
    );
    const c = useUploadIdentityDocument();
    c.selectDocumentType("special_permanent_resident_cert");
    await c.selectFile("front", makeJpeg("front.jpg"));
    const r = await c.submit();
    expect(r).toEqual({ ok: false, error: "back_required" });
  });

  it("パスポート + 表面のみ → back_required", async () => {
    const { useUploadIdentityDocument } = await import(
      "./useUploadIdentityDocument"
    );
    const c = useUploadIdentityDocument();
    c.selectDocumentType("passport");
    await c.selectFile("front", makeJpeg("front.jpg"));
    const r = await c.submit();
    expect(r).toEqual({ ok: false, error: "back_required" });
  });

  it("運転免許証 + 表面のみは back_required を返さない (任意のため)", async () => {
    apiMock.insertPendingRecord.mockResolvedValue(DOC_ID);
    apiMock.uploadFileToStorage.mockResolvedValue(undefined);
    apiMock.confirmStoragePaths.mockResolvedValue(undefined);

    const { useUploadIdentityDocument } = await import(
      "./useUploadIdentityDocument"
    );
    const c = useUploadIdentityDocument();
    c.selectDocumentType("drivers_license");
    await c.selectFile("front", makeJpeg("front.jpg"));
    const r = await c.submit();
    expect(r.ok).toBe(true);
  });

  it("在留カード + 表裏両方なら成功", async () => {
    apiMock.insertPendingRecord.mockResolvedValue(DOC_ID);
    apiMock.uploadFileToStorage.mockResolvedValue(undefined);
    apiMock.confirmStoragePaths.mockResolvedValue(undefined);

    const { useUploadIdentityDocument } = await import(
      "./useUploadIdentityDocument"
    );
    const c = useUploadIdentityDocument();
    c.selectDocumentType("residence_card");
    await c.selectFile("front", makeJpeg("front.jpg"));
    await c.selectFile("back", makeJpeg("back.jpg"));
    const r = await c.submit();
    expect(r.ok).toBe(true);
  });
});

describe("submit — happy path", () => {
  it("表面のみで成功 (storage_path_back=null)", async () => {
    apiMock.insertPendingRecord.mockResolvedValue(DOC_ID);
    apiMock.uploadFileToStorage.mockResolvedValue(undefined);
    apiMock.confirmStoragePaths.mockResolvedValue(undefined);

    const { useUploadIdentityDocument } = await import(
      "./useUploadIdentityDocument"
    );
    const c = useUploadIdentityDocument();
    c.selectDocumentType("drivers_license");
    await c.selectFile("front", makeJpeg("front.jpg"));

    const r = await c.submit();
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe(DOC_ID);
    expect(apiMock.insertPendingRecord).toHaveBeenCalledWith(
      MEMBER_ID,
      "drivers_license",
    );
    expect(apiMock.uploadFileToStorage).toHaveBeenCalledTimes(1);
    expect(apiMock.confirmStoragePaths).toHaveBeenCalledWith(DOC_ID, {
      front: PATH_FRONT,
      back: null,
    });
    expect(c.pageState.value).toBe("success");
  });

  it("表裏両方で成功 (storage_path_back あり)", async () => {
    apiMock.insertPendingRecord.mockResolvedValue(DOC_ID);
    apiMock.uploadFileToStorage.mockResolvedValue(undefined);
    apiMock.confirmStoragePaths.mockResolvedValue(undefined);

    const { useUploadIdentityDocument } = await import(
      "./useUploadIdentityDocument"
    );
    const c = useUploadIdentityDocument();
    c.selectDocumentType("residence_card");
    await c.selectFile("front", makeJpeg("front.jpg"));
    await c.selectFile("back", makeJpeg("back.jpg"));

    const r = await c.submit();
    expect(r.ok).toBe(true);
    expect(apiMock.uploadFileToStorage).toHaveBeenCalledTimes(2);
    expect(apiMock.confirmStoragePaths).toHaveBeenCalledWith(DOC_ID, {
      front: PATH_FRONT,
      back: PATH_BACK,
    });
  });
});

describe("submit — エラー / ロールバック", () => {
  it("表面 upload 失敗 → 行 DELETE → storage_failed_front", async () => {
    apiMock.insertPendingRecord.mockResolvedValue(DOC_ID);
    apiMock.uploadFileToStorage.mockRejectedValue(new Error("storage down"));

    const { useUploadIdentityDocument } = await import(
      "./useUploadIdentityDocument"
    );
    const c = useUploadIdentityDocument();
    c.selectDocumentType("drivers_license");
    await c.selectFile("front", makeJpeg());

    const r = await c.submit();
    expect(r).toEqual({ ok: false, error: "storage_failed_front" });
    expect(apiMock.rollbackRecord).toHaveBeenCalledWith(DOC_ID);
  });

  it("裏面 upload 失敗 → 表面 Storage 削除 + 行 DELETE → storage_failed_back", async () => {
    apiMock.insertPendingRecord.mockResolvedValue(DOC_ID);
    apiMock.uploadFileToStorage
      .mockResolvedValueOnce(undefined) // front 成功
      .mockRejectedValueOnce(new Error("storage down")); // back 失敗

    const { useUploadIdentityDocument } = await import(
      "./useUploadIdentityDocument"
    );
    const c = useUploadIdentityDocument();
    c.selectDocumentType("residence_card");
    await c.selectFile("front", makeJpeg("front.jpg"));
    await c.selectFile("back", makeJpeg("back.jpg"));

    const r = await c.submit();
    expect(r).toEqual({ ok: false, error: "storage_failed_back" });
    expect(apiMock.removeStorageObjects).toHaveBeenCalledWith([PATH_FRONT]);
    expect(apiMock.rollbackRecord).toHaveBeenCalledWith(DOC_ID);
  });

  it("DB INSERT 失敗 → db_failed", async () => {
    apiMock.insertPendingRecord.mockRejectedValue(new Error("db down"));

    const { useUploadIdentityDocument } = await import(
      "./useUploadIdentityDocument"
    );
    const c = useUploadIdentityDocument();
    c.selectDocumentType("drivers_license");
    await c.selectFile("front", makeJpeg());

    const r = await c.submit();
    expect(r).toEqual({ ok: false, error: "db_failed" });
    expect(apiMock.uploadFileToStorage).not.toHaveBeenCalled();
  });

  it("最終 UPDATE 失敗 → db_failed (Storage には実体あり)", async () => {
    apiMock.insertPendingRecord.mockResolvedValue(DOC_ID);
    apiMock.uploadFileToStorage.mockResolvedValue(undefined);
    apiMock.confirmStoragePaths.mockRejectedValue(new Error("update fail"));

    const { useUploadIdentityDocument } = await import(
      "./useUploadIdentityDocument"
    );
    const c = useUploadIdentityDocument();
    c.selectDocumentType("drivers_license");
    await c.selectFile("front", makeJpeg());

    const r = await c.submit();
    expect(r).toEqual({ ok: false, error: "db_failed" });
  });
});
