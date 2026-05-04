import { beforeEach, describe, expect, it, vi } from "vitest";
import type { IdentityDocumentId } from "@high-q/shared";

const builderResult = {
  data: null as unknown,
  error: null as unknown,
  count: 0 as number | null,
};

function makeBuilder() {
  const builder: Record<string, unknown> = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockImplementation(async () => ({ ...builderResult })),
    maybeSingle: vi.fn().mockImplementation(async () => ({
      data: builderResult.data,
      error: builderResult.error,
    })),
    then: undefined,
  };
  return builder;
}

let currentBuilder = makeBuilder();
const fromMock = vi.fn();

const supabaseClient = {
  from: fromMock,
};

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
  builderResult.count = 0;
});

describe("fetchIdentityDocumentsList", () => {
  it("identity_documents を SELECT し、members の foreign join を含む", async () => {
    const { fetchIdentityDocumentsList } = await import(
      "./identityDocumentQueries"
    );
    await fetchIdentityDocumentsList({
      status: "pending",
      q: "",
      page: 1,
      per: 25,
    });
    expect(fromMock).toHaveBeenCalledWith("identity_documents");
    const selectCall = currentBuilder.select as ReturnType<typeof vi.fn>;
    const firstArg = selectCall.mock.calls[0]?.[0] as string;
    expect(firstArg).toContain("member:members");
    expect(firstArg).toContain("display_name");
    expect(firstArg).toContain("email");
  });

  it("status='pending' のとき eq('status', 'pending') が付く", async () => {
    const { fetchIdentityDocumentsList } = await import(
      "./identityDocumentQueries"
    );
    await fetchIdentityDocumentsList({
      status: "pending",
      q: "",
      page: 1,
      per: 25,
    });
    expect(currentBuilder.eq).toHaveBeenCalledWith("status", "pending");
  });

  it("status='approved' のとき eq('status', 'approved') が付く", async () => {
    const { fetchIdentityDocumentsList } = await import(
      "./identityDocumentQueries"
    );
    await fetchIdentityDocumentsList({
      status: "approved",
      q: "",
      page: 1,
      per: 25,
    });
    expect(currentBuilder.eq).toHaveBeenCalledWith("status", "approved");
  });

  it("status='all' のとき eq は呼ばれない", async () => {
    const { fetchIdentityDocumentsList } = await import(
      "./identityDocumentQueries"
    );
    await fetchIdentityDocumentsList({
      status: "all",
      q: "",
      page: 1,
      per: 25,
    });
    expect(currentBuilder.eq).not.toHaveBeenCalled();
  });

  it("q が空でないとき members への or 条件 (display_name / email ILIKE) が付く", async () => {
    const { fetchIdentityDocumentsList } = await import(
      "./identityDocumentQueries"
    );
    await fetchIdentityDocumentsList({
      status: "pending",
      q: "tanaka",
      page: 1,
      per: 25,
    });
    const orCall = currentBuilder.or as ReturnType<typeof vi.fn>;
    expect(orCall).toHaveBeenCalled();
    const filter = orCall.mock.calls[0]?.[0] as string;
    expect(filter).toContain("display_name.ilike.%tanaka%");
    expect(filter).toContain("email.ilike.%tanaka%");
  });

  it("uploaded_at desc でソートされる", async () => {
    const { fetchIdentityDocumentsList } = await import(
      "./identityDocumentQueries"
    );
    await fetchIdentityDocumentsList({
      status: "pending",
      q: "",
      page: 1,
      per: 25,
    });
    expect(currentBuilder.order).toHaveBeenCalledWith("uploaded_at", {
      ascending: false,
    });
  });

  it("page=1 / per=25 で range(0, 24)", async () => {
    const { fetchIdentityDocumentsList } = await import(
      "./identityDocumentQueries"
    );
    await fetchIdentityDocumentsList({
      status: "pending",
      q: "",
      page: 1,
      per: 25,
    });
    expect(currentBuilder.range).toHaveBeenCalledWith(0, 24);
  });

  it("page=3 / per=25 で range(50, 74)", async () => {
    const { fetchIdentityDocumentsList } = await import(
      "./identityDocumentQueries"
    );
    await fetchIdentityDocumentsList({
      status: "pending",
      q: "",
      page: 3,
      per: 25,
    });
    expect(currentBuilder.range).toHaveBeenCalledWith(50, 74);
  });

  it("正常系で rows と total を返す", async () => {
    const { fetchIdentityDocumentsList } = await import(
      "./identityDocumentQueries"
    );
    builderResult.data = [
      {
        id: "doc-1",
        member_id: "mem-1",
        document_type: "drivers_license",
        status: "pending",
        uploaded_at: "2026-05-05T00:00:00Z",
        member: { display_name: "田中", email: "tanaka@example.com" },
      },
    ];
    builderResult.count = 1;
    const result = await fetchIdentityDocumentsList({
      status: "pending",
      q: "",
      page: 1,
      per: 25,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.rows).toHaveLength(1);
      expect(result.value.total).toBe(1);
      expect(result.value.rows[0]?.member.display_name).toBe("田中");
    }
  });

  it("エラー時は SERVER_ERROR を返す", async () => {
    const { fetchIdentityDocumentsList } = await import(
      "./identityDocumentQueries"
    );
    builderResult.error = { message: "rls-violation" };
    const result = await fetchIdentityDocumentsList({
      status: "pending",
      q: "",
      page: 1,
      per: 25,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("SERVER_ERROR");
    }
  });

  it("status='all' のときクライアント側で pending を最上位にソートする", async () => {
    const { fetchIdentityDocumentsList } = await import(
      "./identityDocumentQueries"
    );
    builderResult.data = [
      {
        id: "doc-old-approved",
        member_id: "m1",
        document_type: "drivers_license",
        status: "approved",
        uploaded_at: "2026-05-01T00:00:00Z",
        member: { display_name: "A", email: "a@x" },
      },
      {
        id: "doc-new-pending",
        member_id: "m2",
        document_type: "drivers_license",
        status: "pending",
        uploaded_at: "2026-05-05T00:00:00Z",
        member: { display_name: "B", email: "b@x" },
      },
      {
        id: "doc-mid-rejected",
        member_id: "m3",
        document_type: "passport",
        status: "rejected",
        uploaded_at: "2026-05-03T00:00:00Z",
        member: { display_name: "C", email: "c@x" },
      },
    ];
    builderResult.count = 3;
    const result = await fetchIdentityDocumentsList({
      status: "all",
      q: "",
      page: 1,
      per: 25,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      // pending が最上位
      expect(result.value.rows[0]?.id).toBe("doc-new-pending");
    }
  });
});

describe("getIdentityDocumentById", () => {
  it("identity_documents を id で eq + maybeSingle で取得する", async () => {
    const { getIdentityDocumentById } = await import(
      "./identityDocumentQueries"
    );
    builderResult.data = {
      id: "doc-1",
      member_id: "mem-1",
      document_type: "drivers_license",
      status: "pending",
      rejection_reason: null,
      storage_path_front: "mem-1/doc-1-front.jpg",
      storage_path_back: null,
      uploaded_at: "2026-05-05T00:00:00Z",
      reviewed_at: null,
      reviewed_by: null,
      member: {
        display_name: "田中",
        email: "tanaka@example.com",
        birthday: "1990-01-01",
        phone: "090-0000-0000",
        experience_level: "beginner",
      },
    };
    const result = await getIdentityDocumentById(
      "doc-1" as IdentityDocumentId,
    );
    expect(fromMock).toHaveBeenCalledWith("identity_documents");
    expect(currentBuilder.eq).toHaveBeenCalledWith("id", "doc-1");
    expect(currentBuilder.maybeSingle).toHaveBeenCalled();
    expect(result.ok).toBe(true);
  });

  it("members の詳細列 (birthday / phone / experience_level) を join 取得する", async () => {
    const { getIdentityDocumentById } = await import(
      "./identityDocumentQueries"
    );
    await getIdentityDocumentById("doc-1" as IdentityDocumentId);
    const selectArg = (currentBuilder.select as ReturnType<typeof vi.fn>).mock
      .calls[0]?.[0] as string;
    expect(selectArg).toContain("birthday");
    expect(selectArg).toContain("phone");
    expect(selectArg).toContain("experience_level");
  });

  it("0 行で NOT_FOUND を返す", async () => {
    const { getIdentityDocumentById } = await import(
      "./identityDocumentQueries"
    );
    builderResult.data = null;
    const result = await getIdentityDocumentById(
      "missing-id" as IdentityDocumentId,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("NOT_FOUND");
    }
  });

  it("エラー時は SERVER_ERROR を返す", async () => {
    const { getIdentityDocumentById } = await import(
      "./identityDocumentQueries"
    );
    builderResult.error = { message: "network" };
    const result = await getIdentityDocumentById(
      "doc-1" as IdentityDocumentId,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("SERVER_ERROR");
    }
  });
});

describe("fetchPendingCount", () => {
  it("count='exact' / head=true で identity_documents を SELECT する", async () => {
    const { fetchPendingCount } = await import("./identityDocumentQueries");
    // head=true は range を呼ばずに builder の最後の chain で count を返す
    // builder 実装上、awaitable な builder を作る必要があるが、
    // 単純化のため builderResult.count を range の戻り値として使う
    currentBuilder.range = vi.fn().mockImplementation(async () => ({
      data: null,
      error: null,
      count: 5,
    }));
    // head=true 経路: select の戻り値が直接 awaitable
    // 実際には eq() の後で awaitable になるが、テスト用 builder は eq まで chain
    const eqMock = currentBuilder.eq as ReturnType<typeof vi.fn>;
    eqMock.mockImplementation(() => ({
      data: null,
      error: null,
      count: 5,
      then: (resolve: (v: unknown) => void) =>
        resolve({ data: null, error: null, count: 5 }),
    }));
    const result = await fetchPendingCount();
    expect(fromMock).toHaveBeenCalledWith("identity_documents");
    const selectCall = currentBuilder.select as ReturnType<typeof vi.fn>;
    expect(selectCall).toHaveBeenCalledWith(
      "*",
      expect.objectContaining({ count: "exact", head: true }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(5);
    }
  });

  it("status='pending' を eq で絞り込む", async () => {
    const { fetchPendingCount } = await import("./identityDocumentQueries");
    const eqMock = currentBuilder.eq as ReturnType<typeof vi.fn>;
    eqMock.mockImplementation(() => ({
      data: null,
      error: null,
      count: 0,
      then: (resolve: (v: unknown) => void) =>
        resolve({ data: null, error: null, count: 0 }),
    }));
    await fetchPendingCount();
    expect(eqMock).toHaveBeenCalledWith("status", "pending");
  });

  it("count が null のとき 0 を返す", async () => {
    const { fetchPendingCount } = await import("./identityDocumentQueries");
    const eqMock = currentBuilder.eq as ReturnType<typeof vi.fn>;
    eqMock.mockImplementation(() => ({
      data: null,
      error: null,
      count: null,
      then: (resolve: (v: unknown) => void) =>
        resolve({ data: null, error: null, count: null }),
    }));
    const result = await fetchPendingCount();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(0);
    }
  });

  it("エラー時は SERVER_ERROR を返す", async () => {
    const { fetchPendingCount } = await import("./identityDocumentQueries");
    const eqMock = currentBuilder.eq as ReturnType<typeof vi.fn>;
    eqMock.mockImplementation(() => ({
      data: null,
      error: { message: "permission denied" },
      count: null,
      then: (resolve: (v: unknown) => void) =>
        resolve({
          data: null,
          error: { message: "permission denied" },
          count: null,
        }),
    }));
    const result = await fetchPendingCount();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("SERVER_ERROR");
    }
  });
});
