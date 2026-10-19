import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const apiMock = {
  insertRecord: vi.fn(),
  uploadFileToStorage: vi.fn(),
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

const notificationMock = {
  triggerIdentityDocumentPendingNotification: vi.fn(async () => undefined),
};
vi.mock("@/shared/api/identity-document-notification", () => notificationMock);

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
  // id はクライアント採番 (crypto.randomUUID)。テストでは固定値に差し替える
  vi.spyOn(crypto, "randomUUID").mockReturnValue(
    DOC_ID as `${string}-${string}-${string}-${string}-${string}`,
  );
  notificationMock.triggerIdentityDocumentPendingNotification.mockResolvedValue(
    undefined,
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
    apiMock.insertRecord.mockResolvedValue(undefined);
    apiMock.uploadFileToStorage.mockResolvedValue(undefined);

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
    apiMock.insertRecord.mockResolvedValue(undefined);
    apiMock.uploadFileToStorage.mockResolvedValue(undefined);

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
    apiMock.insertRecord.mockResolvedValue(undefined);
    apiMock.uploadFileToStorage.mockResolvedValue(undefined);

    const { useUploadIdentityDocument } = await import(
      "./useUploadIdentityDocument"
    );
    const c = useUploadIdentityDocument();
    c.selectDocumentType("drivers_license");
    await c.selectFile("front", makeJpeg("front.jpg"));

    const r = await c.submit();
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe(DOC_ID);
    // upload が先、行 INSERT は最後の 1 回。確定 UPDATE は存在しない
    expect(apiMock.uploadFileToStorage).toHaveBeenCalledTimes(1);
    expect(apiMock.insertRecord).toHaveBeenCalledTimes(1);
    expect(apiMock.insertRecord).toHaveBeenCalledWith({
      id: DOC_ID,
      memberId: MEMBER_ID,
      documentType: "drivers_license",
      frontPath: PATH_FRONT,
      backPath: null,
    });
    expect(c.pageState.value).toBe("success");
  });

  it("表裏両方で成功 (storage_path_back あり)", async () => {
    apiMock.insertRecord.mockResolvedValue(undefined);
    apiMock.uploadFileToStorage.mockResolvedValue(undefined);

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
    expect(apiMock.insertRecord).toHaveBeenCalledWith({
      id: DOC_ID,
      memberId: MEMBER_ID,
      documentType: "residence_card",
      frontPath: PATH_FRONT,
      backPath: PATH_BACK,
    });
  });

  it("[回帰 #379] 行が INSERT される時、storage_path は実パスで placeholder を含まない", async () => {
    apiMock.insertRecord.mockResolvedValue(undefined);
    apiMock.uploadFileToStorage.mockResolvedValue(undefined);

    const { useUploadIdentityDocument } = await import(
      "./useUploadIdentityDocument"
    );
    const c = useUploadIdentityDocument();
    c.selectDocumentType("drivers_license");
    await c.selectFile("front", makeJpeg("front.jpg"));

    await c.submit();
    // upload が INSERT より先に呼ばれている (invocationCallOrder で順序を検証)
    const uploadOrder =
      apiMock.uploadFileToStorage.mock.invocationCallOrder[0]!;
    const insertOrder = apiMock.insertRecord.mock.invocationCallOrder[0]!;
    expect(uploadOrder).toBeLessThan(insertOrder);
    // INSERT payload の storage_path は upload 済み実パスと一致し、仮パスを含まない
    const payload = apiMock.insertRecord.mock.calls[0]![0] as {
      frontPath: string;
      backPath: string | null;
    };
    expect(payload.frontPath).toBe(PATH_FRONT);
    expect(payload.frontPath).not.toContain("__pending__");
  });
});

describe("submit — エラー / ロールバック", () => {
  it("表面 upload 失敗 → 行は作られず storage_failed_front", async () => {
    apiMock.insertRecord.mockResolvedValue(undefined);
    apiMock.uploadFileToStorage.mockRejectedValue(new Error("storage down"));

    const { useUploadIdentityDocument } = await import(
      "./useUploadIdentityDocument"
    );
    const c = useUploadIdentityDocument();
    c.selectDocumentType("drivers_license");
    await c.selectFile("front", makeJpeg());

    const r = await c.submit();
    expect(r).toEqual({ ok: false, error: "storage_failed_front" });
    // 行はまだ作られていない (INSERT は呼ばれない)
    expect(apiMock.insertRecord).not.toHaveBeenCalled();
  });

  it("裏面 upload 失敗 → 表面 Storage 削除 + 行は作られず storage_failed_back", async () => {
    apiMock.insertRecord.mockResolvedValue(undefined);
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
    expect(apiMock.insertRecord).not.toHaveBeenCalled();
  });

  it("行 INSERT 失敗 → 表裏オブジェクト撤去 → db_failed", async () => {
    apiMock.insertRecord.mockRejectedValue(new Error("db down"));
    apiMock.uploadFileToStorage.mockResolvedValue(undefined);

    const { useUploadIdentityDocument } = await import(
      "./useUploadIdentityDocument"
    );
    const c = useUploadIdentityDocument();
    c.selectDocumentType("residence_card");
    await c.selectFile("front", makeJpeg("front.jpg"));
    await c.selectFile("back", makeJpeg("back.jpg"));

    const r = await c.submit();
    expect(r).toEqual({ ok: false, error: "db_failed" });
    // upload は INSERT より先に実行済み、INSERT 失敗で孤立オブジェクトを撤去する
    expect(apiMock.uploadFileToStorage).toHaveBeenCalledTimes(2);
    expect(apiMock.removeStorageObjects).toHaveBeenCalledWith([
      PATH_FRONT,
      PATH_BACK,
    ]);
  });

  it("行 INSERT 失敗 (表面のみ) → 表面オブジェクト撤去 → db_failed", async () => {
    apiMock.insertRecord.mockRejectedValue(new Error("db down"));
    apiMock.uploadFileToStorage.mockResolvedValue(undefined);

    const { useUploadIdentityDocument } = await import(
      "./useUploadIdentityDocument"
    );
    const c = useUploadIdentityDocument();
    c.selectDocumentType("drivers_license");
    await c.selectFile("front", makeJpeg());

    const r = await c.submit();
    expect(r).toEqual({ ok: false, error: "db_failed" });
    expect(apiMock.removeStorageObjects).toHaveBeenCalledWith([PATH_FRONT]);
  });
});

describe("submit — オーナー通知 trigger (#284)", () => {
  it("表面のみ happy path で triggerIdentityDocumentPendingNotification が DOC_ID で 1 回呼ばれる", async () => {
    apiMock.insertRecord.mockResolvedValue(undefined);
    apiMock.uploadFileToStorage.mockResolvedValue(undefined);

    const { useUploadIdentityDocument } = await import(
      "./useUploadIdentityDocument"
    );
    const c = useUploadIdentityDocument();
    c.selectDocumentType("drivers_license");
    await c.selectFile("front", makeJpeg("front.jpg"));

    await c.submit();
    expect(
      notificationMock.triggerIdentityDocumentPendingNotification,
    ).toHaveBeenCalledTimes(1);
    expect(
      notificationMock.triggerIdentityDocumentPendingNotification,
    ).toHaveBeenCalledWith(DOC_ID);
  });

  it("表裏両方 happy path でも trigger は 1 回 (表裏で 2 回呼ばれない)", async () => {
    apiMock.insertRecord.mockResolvedValue(undefined);
    apiMock.uploadFileToStorage.mockResolvedValue(undefined);

    const { useUploadIdentityDocument } = await import(
      "./useUploadIdentityDocument"
    );
    const c = useUploadIdentityDocument();
    c.selectDocumentType("residence_card");
    await c.selectFile("front", makeJpeg("front.jpg"));
    await c.selectFile("back", makeJpeg("back.jpg"));

    await c.submit();
    expect(
      notificationMock.triggerIdentityDocumentPendingNotification,
    ).toHaveBeenCalledTimes(1);
  });

  it("storage_failed_front 分岐では trigger を呼ばない", async () => {
    apiMock.insertRecord.mockResolvedValue(undefined);
    apiMock.uploadFileToStorage.mockRejectedValue(new Error("storage down"));

    const { useUploadIdentityDocument } = await import(
      "./useUploadIdentityDocument"
    );
    const c = useUploadIdentityDocument();
    c.selectDocumentType("drivers_license");
    await c.selectFile("front", makeJpeg());

    await c.submit();
    expect(
      notificationMock.triggerIdentityDocumentPendingNotification,
    ).not.toHaveBeenCalled();
  });

  it("storage_failed_back 分岐では trigger を呼ばない", async () => {
    apiMock.insertRecord.mockResolvedValue(undefined);
    apiMock.uploadFileToStorage
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("storage down"));

    const { useUploadIdentityDocument } = await import(
      "./useUploadIdentityDocument"
    );
    const c = useUploadIdentityDocument();
    c.selectDocumentType("residence_card");
    await c.selectFile("front", makeJpeg("front.jpg"));
    await c.selectFile("back", makeJpeg("back.jpg"));

    await c.submit();
    expect(
      notificationMock.triggerIdentityDocumentPendingNotification,
    ).not.toHaveBeenCalled();
  });

  it("db_failed (行 INSERT 失敗) でも trigger を呼ばない", async () => {
    apiMock.insertRecord.mockRejectedValue(new Error("db down"));
    apiMock.uploadFileToStorage.mockResolvedValue(undefined);

    const { useUploadIdentityDocument } = await import(
      "./useUploadIdentityDocument"
    );
    const c = useUploadIdentityDocument();
    c.selectDocumentType("drivers_license");
    await c.selectFile("front", makeJpeg());

    await c.submit();
    expect(
      notificationMock.triggerIdentityDocumentPendingNotification,
    ).not.toHaveBeenCalled();
  });

  it("trigger 内部失敗が submit の成功判定を覆さない", async () => {
    apiMock.insertRecord.mockResolvedValue(undefined);
    apiMock.uploadFileToStorage.mockResolvedValue(undefined);
    // notification 側は元々握りつぶす設計だが、defensive に rejected でも submit が ok を返すことを確認
    notificationMock.triggerIdentityDocumentPendingNotification.mockRejectedValue(
      new Error("notification down"),
    );

    const { useUploadIdentityDocument } = await import(
      "./useUploadIdentityDocument"
    );
    const c = useUploadIdentityDocument();
    c.selectDocumentType("drivers_license");
    await c.selectFile("front", makeJpeg("front.jpg"));

    const r = await c.submit();
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe(DOC_ID);
  });
});
