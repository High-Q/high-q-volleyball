import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MemberId } from "@high-q/shared";

const builderResult = {
  data: null as unknown,
  error: null as unknown,
};

function makeBuilder() {
  const builder: Record<string, unknown> = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    // builder 自体を await すると query が走る (Supabase は PromiseLike)
    then: (resolve: (v: unknown) => void) =>
      resolve({ data: builderResult.data, error: builderResult.error }),
  };
  return builder;
}

let currentBuilder = makeBuilder();
const fromMock = vi.fn();
const supabaseClient = { from: fromMock };

vi.mock("@/shared/api/supabase", () => ({
  getSupabase: () => supabaseClient,
  _resetSupabaseForTest: () => {},
}));

beforeEach(() => {
  vi.clearAllMocks();
  currentBuilder = makeBuilder();
  fromMock.mockReturnValue(currentBuilder);
  builderResult.data = [];
  builderResult.error = null;
});

const ids = ["mem-1", "mem-2"] as unknown as MemberId[];

describe("fetchApprovedDocumentsByMemberIds", () => {
  it("identity_documents を SELECT し member の姓名/表示名/email を FK 明示 join する", async () => {
    const { fetchApprovedDocumentsByMemberIds } = await import(
      "./approvedDocumentQueries"
    );
    await fetchApprovedDocumentsByMemberIds(ids);
    expect(fromMock).toHaveBeenCalledWith("identity_documents");
    const selectArg = (currentBuilder.select as ReturnType<typeof vi.fn>).mock
      .calls[0]?.[0] as string;
    expect(selectArg).toContain("member:members!identity_documents_member_id_fkey");
    expect(selectArg).toContain("last_name");
    expect(selectArg).toContain("first_name");
    expect(selectArg).toContain("storage_path_front");
    expect(selectArg).toContain("storage_path_back");
  });

  it("status='approved' と member_id in (...) で絞り込む", async () => {
    const { fetchApprovedDocumentsByMemberIds } = await import(
      "./approvedDocumentQueries"
    );
    await fetchApprovedDocumentsByMemberIds(ids);
    expect(currentBuilder.eq).toHaveBeenCalledWith("status", "approved");
    expect(currentBuilder.in).toHaveBeenCalledWith("member_id", [
      "mem-1",
      "mem-2",
    ]);
  });

  it("表裏がともに NULL の書類を除外する or 条件を付ける", async () => {
    const { fetchApprovedDocumentsByMemberIds } = await import(
      "./approvedDocumentQueries"
    );
    await fetchApprovedDocumentsByMemberIds(ids);
    const orArg = (currentBuilder.or as ReturnType<typeof vi.fn>).mock
      .calls[0]?.[0] as string;
    expect(orArg).toContain("storage_path_front.not.is.null");
    expect(orArg).toContain("storage_path_back.not.is.null");
  });

  it("memberIds が空のときはクエリを投げず空配列を返す", async () => {
    const { fetchApprovedDocumentsByMemberIds } = await import(
      "./approvedDocumentQueries"
    );
    const result = await fetchApprovedDocumentsByMemberIds([]);
    expect(fromMock).not.toHaveBeenCalled();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toEqual([]);
  });

  it("正常系で承認済み書類の配列を返す", async () => {
    const { fetchApprovedDocumentsByMemberIds } = await import(
      "./approvedDocumentQueries"
    );
    builderResult.data = [
      {
        id: "doc-1",
        member_id: "mem-1",
        document_type: "drivers_license",
        status: "approved",
        uploaded_at: "2026-05-05T00:00:00Z",
        storage_path_front: "mem-1/doc-1-front.jpg",
        storage_path_back: "mem-1/doc-1-back.jpg",
        member: {
          last_name: "田中",
          first_name: "太郎",
          display_name: "田中 太郎",
          email: "tanaka@example.com",
        },
      },
    ];
    const result = await fetchApprovedDocumentsByMemberIds(ids);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(1);
      expect(result.value[0]?.member.last_name).toBe("田中");
    }
  });

  it("エラー時は SERVER_ERROR を返す", async () => {
    const { fetchApprovedDocumentsByMemberIds } = await import(
      "./approvedDocumentQueries"
    );
    builderResult.error = { message: "rls-violation" };
    const result = await fetchApprovedDocumentsByMemberIds(ids);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("SERVER_ERROR");
  });
});
