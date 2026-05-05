import { beforeEach, describe, expect, it, vi } from "vitest";

const supabaseMock = {
  from: vi.fn(),
};

vi.mock("@/shared/api/supabase", () => ({
  getSupabase: () => supabaseMock,
}));

const UID = "00000000-0000-0000-0000-000000000001";

function buildBuilder(data: unknown, error: unknown = null) {
  const limit = vi.fn().mockResolvedValue({ data, error });
  const inFn = vi.fn(() => ({ limit }));
  const eq = vi.fn(() => ({ in: inFn }));
  const select = vi.fn(() => ({ eq }));
  return { limit, inFn, eq, select };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("fetchHasIdentityDocument (#171 で status in pending/approved に拡張)", () => {
  it("0 件なら false を返す + SQL 形式 (member_id eq + status in [pending, approved] + limit 1)", async () => {
    const { limit, inFn, eq, select } = buildBuilder([]);
    supabaseMock.from.mockReturnValue({ select });

    const { fetchHasIdentityDocument } = await import(
      "./identity-document-existence"
    );
    const result = await fetchHasIdentityDocument(UID);

    expect(result).toBe(false);
    expect(supabaseMock.from).toHaveBeenCalledWith("identity_documents");
    expect(select).toHaveBeenCalledWith("id");
    expect(eq).toHaveBeenCalledWith("member_id", UID);
    expect(inFn).toHaveBeenCalledWith("status", ["pending", "approved"]);
    expect(limit).toHaveBeenCalledWith(1);
  });

  it("pending 行が 1 件以上で true を返す", async () => {
    const { select } = buildBuilder([{ id: "doc-1" }]);
    supabaseMock.from.mockReturnValue({ select });
    const { fetchHasIdentityDocument } = await import(
      "./identity-document-existence"
    );
    expect(await fetchHasIdentityDocument(UID)).toBe(true);
  });

  it("approved 行が 1 件以上で true を返す", async () => {
    const { select } = buildBuilder([{ id: "doc-2" }]);
    supabaseMock.from.mockReturnValue({ select });
    const { fetchHasIdentityDocument } = await import(
      "./identity-document-existence"
    );
    expect(await fetchHasIdentityDocument(UID)).toBe(true);
  });

  it("rejected のみ持つ member は false を返す (SQL レベルで除外)", async () => {
    // SQL の WHERE status IN ('pending', 'approved') により rejected 行は
    // 結果に含まれず data=[] が返る → false
    const { select } = buildBuilder([]);
    supabaseMock.from.mockReturnValue({ select });
    const { fetchHasIdentityDocument } = await import(
      "./identity-document-existence"
    );
    expect(await fetchHasIdentityDocument(UID)).toBe(false);
  });

  it("pending + rejected 混在 member は true (pending が含まれるため SQL 結果に 1 件以上)", async () => {
    const { select } = buildBuilder([{ id: "doc-pending" }]);
    supabaseMock.from.mockReturnValue({ select });
    const { fetchHasIdentityDocument } = await import(
      "./identity-document-existence"
    );
    expect(await fetchHasIdentityDocument(UID)).toBe(true);
  });

  it("RLS により 0 件 (other member) でも false 扱い", async () => {
    const { select } = buildBuilder([]);
    supabaseMock.from.mockReturnValue({ select });
    const { fetchHasIdentityDocument } = await import(
      "./identity-document-existence"
    );
    expect(await fetchHasIdentityDocument(UID)).toBe(false);
  });

  it("network エラー時は throw する", async () => {
    const { select } = buildBuilder(null, { message: "boom" });
    supabaseMock.from.mockReturnValue({ select });
    const { fetchHasIdentityDocument } = await import(
      "./identity-document-existence"
    );
    await expect(fetchHasIdentityDocument(UID)).rejects.toMatchObject({
      message: "boom",
    });
  });
});
