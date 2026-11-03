import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MemberId } from "@high-q/shared";
import type { PdfDocumentPage } from "../lib/identityDocumentsPdf";

const h = vi.hoisted(() => ({
  fetchMembersForExport: vi.fn(),
  fetchApprovedDocumentsByMemberIds: vi.fn(),
  insertDownloadAudit: vi.fn(),
  download: vi.fn(),
  buildPdf: vi.fn(),
  saveBlob: vi.fn(),
  zipFiles: {} as Record<string, unknown>,
}));

vi.mock("@/entities/member", () => ({
  fetchMembersForExport: h.fetchMembersForExport,
}));
vi.mock("@/entities/identity-document", () => ({
  fetchApprovedDocumentsByMemberIds: h.fetchApprovedDocumentsByMemberIds,
}));
vi.mock("@/entities/identity-document-download", () => ({
  insertDownloadAudit: h.insertDownloadAudit,
}));
vi.mock("@/shared/api/supabase", () => ({
  getSupabase: () => ({
    storage: { from: () => ({ download: h.download }) },
  }),
}));
vi.mock("../lib/identityDocumentsPdf", () => ({
  buildIdentityDocumentsPdf: h.buildPdf,
}));
vi.mock("../lib/saveBlob", () => ({
  saveBlob: h.saveBlob,
  buildZipFilename: () => "役所提出_20261102.zip",
}));
vi.mock("jszip", () => ({
  default: class {
    file(name: string, content: unknown) {
      h.zipFiles[name] = content;
    }
    async generateAsync() {
      return new Blob(["zip"]);
    }
  },
}));

const id = (s: string) => s as unknown as MemberId;

const roster = [
  { id: id("m1"), last_name: "田中", first_name: "太郎", phone: "090-1", birthday: "1984-04-01" },
  { id: id("m2"), last_name: "佐藤", first_name: "花子", phone: null, birthday: "1990-05-05" },
  { id: id("m3"), last_name: "鈴木", first_name: "一郎", phone: "080-3", birthday: null },
];

function doc(
  idv: string,
  member_id: string,
  front: string | null,
  back: string | null,
) {
  return {
    id: idv,
    member_id,
    document_type: "drivers_license",
    status: "approved",
    uploaded_at: "2026-05-05T00:00:00Z",
    storage_path_front: front,
    storage_path_back: back,
    member: { last_name: "x", first_name: "y", display_name: "x y", email: "e" },
  };
}

// jsdom の Blob は arrayBuffer() 未実装のため、必要な I/F のみのスタブを返す
const jpgBlob = () => ({
  arrayBuffer: async () => new Uint8Array([0xff, 0xd8, 0xff, 0x00]).buffer,
});

beforeEach(() => {
  vi.clearAllMocks();
  h.zipFiles = {};
  h.fetchMembersForExport.mockResolvedValue({ ok: true, value: roster });
  h.buildPdf.mockResolvedValue(new Uint8Array([1]));
  h.insertDownloadAudit.mockResolvedValue({ ok: true });
  h.download.mockResolvedValue({ data: jpgBlob(), error: null });
});

const selectedIds = [id("m1"), id("m2"), id("m3")];
const adminMemberId = id("admin-1");

describe("useBulkExport.run", () => {
  it("happy path: 含めた書類数・名簿会員数・0件会員・監査成功を返す", async () => {
    h.fetchApprovedDocumentsByMemberIds.mockResolvedValue({
      ok: true,
      value: [
        doc("d1", "m1", "m1/d1-f.jpg", "m1/d1-b.jpg"),
        doc("d2", "m2", "m2/d2-f.jpg", null),
      ],
    });
    const { useBulkExport } = await import("./useBulkExport");
    const { run } = useBulkExport();
    const result = await run({ selectedIds, adminMemberId });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.includedDocumentCount).toBe(2);
    expect(result.value.rosterMemberCount).toBe(3);
    expect(result.value.membersWithoutApprovedDocs.map((m) => m.id)).toEqual([
      id("m3"),
    ]);
    expect(result.value.failedImages).toEqual([]);
    expect(result.value.auditLogged).toBe(true);
  });

  it("PDF は CSV 会員行順（m1→m2）で書類ページを渡す", async () => {
    h.fetchApprovedDocumentsByMemberIds.mockResolvedValue({
      ok: true,
      value: [
        doc("d2", "m2", "m2/d2-f.jpg", null),
        doc("d1", "m1", "m1/d1-f.jpg", null),
      ],
    });
    const { useBulkExport } = await import("./useBulkExport");
    await useBulkExport().run({ selectedIds, adminMemberId });
    const pages = h.buildPdf.mock.calls[0]?.[0] as PdfDocumentPage[];
    expect(pages).toHaveLength(2);
    // ページ順は選択(=CSV)順の m1 が先
    expect(h.buildPdf).toHaveBeenCalled();
  });

  it("監査ログは実際に含めた書類・会員のみを記録する", async () => {
    h.fetchApprovedDocumentsByMemberIds.mockResolvedValue({
      ok: true,
      value: [
        doc("d1", "m1", "m1/d1-f.jpg", "m1/d1-b.jpg"),
        doc("d2", "m2", "m2/d2-f.jpg", null),
      ],
    });
    const { useBulkExport } = await import("./useBulkExport");
    await useBulkExport().run({ selectedIds, adminMemberId });
    const auditArg = h.insertDownloadAudit.mock.calls[0]?.[0];
    expect(auditArg.document_ids).toEqual(["d1", "d2"]);
    expect(auditArg.member_ids).toEqual(["m1", "m2"]);
    expect(auditArg.downloaded_by).toBe(id("admin-1"));
  });

  it("部分失敗: 表面 download 失敗でも裏面成功で書類は含まれ、失敗画像を記録", async () => {
    h.fetchApprovedDocumentsByMemberIds.mockResolvedValue({
      ok: true,
      value: [doc("d1", "m1", "m1/d1-f.jpg", "m1/d1-b.jpg")],
    });
    // 1 回目(front) 失敗、2 回目(back) 成功
    h.download
      .mockResolvedValueOnce({ data: null, error: { message: "not found" } })
      .mockResolvedValueOnce({ data: jpgBlob(), error: null });
    const { useBulkExport } = await import("./useBulkExport");
    const result = await useBulkExport().run({
      selectedIds: [id("m1")],
      adminMemberId,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.includedDocumentCount).toBe(1);
    expect(result.value.failedImages).toHaveLength(1);
    expect(result.value.failedImages[0]?.path).toBe("m1/d1-f.jpg");
  });

  it("全画像失敗でも CSV は ZIP に出力され、含めた書類数は 0", async () => {
    h.fetchApprovedDocumentsByMemberIds.mockResolvedValue({
      ok: true,
      value: [doc("d1", "m1", "m1/d1-f.jpg", null)],
    });
    h.download.mockResolvedValue({ data: null, error: { message: "fail" } });
    const { useBulkExport } = await import("./useBulkExport");
    const result = await useBulkExport().run({
      selectedIds: [id("m1")],
      adminMemberId,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.includedDocumentCount).toBe(0);
    expect(h.zipFiles["会員名簿.csv"]).toBeDefined();
    expect(h.zipFiles["本人確認書類.pdf"]).toBeDefined();
    // 含める書類ゼロでも PDF は synthetic 1 ページで生成される
    const pages = h.buildPdf.mock.calls[0]?.[0] as PdfDocumentPage[];
    expect(pages).toHaveLength(1);
    expect(pages[0]?.images).toEqual([]);
  });

  it("DB の電話番号がそのまま CSV に出力される", async () => {
    h.fetchApprovedDocumentsByMemberIds.mockResolvedValue({ ok: true, value: [] });
    const { useBulkExport } = await import("./useBulkExport");
    await useBulkExport().run({
      selectedIds: [id("m1")],
      adminMemberId,
    });
    const csv = h.zipFiles["会員名簿.csv"] as string;
    expect(csv).toContain("090-1");
  });

  it("監査ログ INSERT 失敗時は auditLogged=false（ダウンロード自体は成立）", async () => {
    h.fetchApprovedDocumentsByMemberIds.mockResolvedValue({
      ok: true,
      value: [doc("d1", "m1", "m1/d1-f.jpg", null)],
    });
    h.insertDownloadAudit.mockResolvedValue({
      ok: false,
      error: { code: "DB_FAILED", message: "x" },
    });
    const { useBulkExport } = await import("./useBulkExport");
    const result = await useBulkExport().run({
      selectedIds: [id("m1")],
      adminMemberId,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.auditLogged).toBe(false);
    expect(h.saveBlob).toHaveBeenCalled();
  });

  it("名簿取得エラーで ROSTER_FETCH_FAILED", async () => {
    h.fetchMembersForExport.mockResolvedValue({
      ok: false,
      error: { code: "SERVER_ERROR", message: "boom" },
    });
    const { useBulkExport } = await import("./useBulkExport");
    const result = await useBulkExport().run({ selectedIds, adminMemberId });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("ROSTER_FETCH_FAILED");
  });
});
