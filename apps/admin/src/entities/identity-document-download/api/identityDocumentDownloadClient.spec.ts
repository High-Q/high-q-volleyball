import { beforeEach, describe, expect, it, vi } from "vitest";
import type { IdentityDocumentId, MemberId } from "@high-q/shared";

const builderResult = {
  error: null as unknown,
};

const insertMock = vi.fn();

function makeBuilder() {
  return {
    insert: insertMock.mockImplementation(() => ({
      then: (resolve: (v: unknown) => void) =>
        resolve({ data: null, error: builderResult.error }),
    })),
  };
}

const fromMock = vi.fn();
const supabaseClient = { from: fromMock };

vi.mock("@/shared/api/supabase", () => ({
  getSupabase: () => supabaseClient,
  _resetSupabaseForTest: () => {},
}));

beforeEach(() => {
  vi.clearAllMocks();
  fromMock.mockReturnValue(makeBuilder());
  builderResult.error = null;
});

const input = {
  downloaded_by: "admin-1" as MemberId,
  member_ids: ["mem-1", "mem-2"] as unknown as MemberId[],
  document_ids: ["doc-1", "doc-2", "doc-3"] as unknown as IdentityDocumentId[],
};

describe("insertDownloadAudit", () => {
  it("identity_document_downloads に payload を INSERT する", async () => {
    const { insertDownloadAudit } = await import(
      "./identityDocumentDownloadClient"
    );
    await insertDownloadAudit(input);
    expect(fromMock).toHaveBeenCalledWith("identity_document_downloads");
    const payload = insertMock.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(payload.downloaded_by).toBe("admin-1");
    expect(payload.member_ids).toEqual(["mem-1", "mem-2"]);
    expect(payload.document_ids).toEqual(["doc-1", "doc-2", "doc-3"]);
  });

  it("件数は配列長から導出される", async () => {
    const { insertDownloadAudit } = await import(
      "./identityDocumentDownloadClient"
    );
    await insertDownloadAudit(input);
    const payload = insertMock.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(payload.member_count).toBe(2);
    expect(payload.document_count).toBe(3);
  });

  it("note 未指定は null で記録される", async () => {
    const { insertDownloadAudit } = await import(
      "./identityDocumentDownloadClient"
    );
    await insertDownloadAudit(input);
    const payload = insertMock.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(payload.note).toBeNull();
  });

  it("note 指定時はその値を記録する", async () => {
    const { insertDownloadAudit } = await import(
      "./identityDocumentDownloadClient"
    );
    await insertDownloadAudit({ ...input, note: "2026 年度 江東区提出" });
    const payload = insertMock.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(payload.note).toBe("2026 年度 江東区提出");
  });

  it("成功時は ok を返す", async () => {
    const { insertDownloadAudit } = await import(
      "./identityDocumentDownloadClient"
    );
    const result = await insertDownloadAudit(input);
    expect(result.ok).toBe(true);
  });

  it("DB エラー時は DB_FAILED を返す", async () => {
    const { insertDownloadAudit } = await import(
      "./identityDocumentDownloadClient"
    );
    builderResult.error = { message: "rls check violation" };
    const result = await insertDownloadAudit(input);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("DB_FAILED");
  });
});
