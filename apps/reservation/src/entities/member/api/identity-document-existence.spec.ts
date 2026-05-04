import { beforeEach, describe, expect, it, vi } from "vitest";

const supabaseMock = {
  from: vi.fn(),
};

vi.mock("@/shared/api/supabase", () => ({
  getSupabase: () => supabaseMock,
}));

const UID = "00000000-0000-0000-0000-000000000001";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("fetchHasIdentityDocument", () => {
  it("0 件なら false を返す", async () => {
    const limit = vi.fn().mockResolvedValue({ data: [], error: null });
    const eq = vi.fn(() => ({ limit }));
    const select = vi.fn(() => ({ eq }));
    supabaseMock.from.mockReturnValue({ select });

    const { fetchHasIdentityDocument } = await import(
      "./identity-document-existence"
    );
    const result = await fetchHasIdentityDocument(UID);

    expect(result).toBe(false);
    expect(supabaseMock.from).toHaveBeenCalledWith("identity_documents");
    expect(select).toHaveBeenCalledWith("id");
    expect(eq).toHaveBeenCalledWith("member_id", UID);
    expect(limit).toHaveBeenCalledWith(1);
  });

  it("1 件以上で true を返す", async () => {
    const limit = vi
      .fn()
      .mockResolvedValue({ data: [{ id: "doc-1" }], error: null });
    supabaseMock.from.mockReturnValue({
      select: vi.fn(() => ({ eq: vi.fn(() => ({ limit })) })),
    });

    const { fetchHasIdentityDocument } = await import(
      "./identity-document-existence"
    );
    expect(await fetchHasIdentityDocument(UID)).toBe(true);
  });

  it("RLS により 0 件 (other member) でも false 扱い", async () => {
    const limit = vi.fn().mockResolvedValue({ data: [], error: null });
    supabaseMock.from.mockReturnValue({
      select: vi.fn(() => ({ eq: vi.fn(() => ({ limit })) })),
    });

    const { fetchHasIdentityDocument } = await import(
      "./identity-document-existence"
    );
    expect(await fetchHasIdentityDocument(UID)).toBe(false);
  });

  it("network エラー時は throw する", async () => {
    const limit = vi
      .fn()
      .mockResolvedValue({ data: null, error: { message: "boom" } });
    supabaseMock.from.mockReturnValue({
      select: vi.fn(() => ({ eq: vi.fn(() => ({ limit })) })),
    });

    const { fetchHasIdentityDocument } = await import(
      "./identity-document-existence"
    );
    await expect(fetchHasIdentityDocument(UID)).rejects.toMatchObject({
      message: "boom",
    });
  });
});
