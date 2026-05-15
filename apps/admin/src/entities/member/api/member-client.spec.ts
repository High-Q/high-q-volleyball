import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MemberId } from "@high-q/shared";

const builderResult = {
  data: null as unknown,
  error: null as unknown,
  count: null as number | null,
};

function makeBuilder() {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockImplementation(async () => ({
      data: builderResult.data,
      error: builderResult.error,
      count: builderResult.count,
    })),
    update: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockImplementation(async () => ({
      data: builderResult.data,
      error: builderResult.error,
    })),
    then: undefined as unknown,
  };
}

let currentBuilder = makeBuilder();
const fromMock = vi.fn();
const supabaseClient = { from: fromMock };

vi.mock("@/shared/api/supabase", () => ({
  getSupabase: () => supabaseClient,
}));

beforeEach(() => {
  vi.clearAllMocks();
  currentBuilder = makeBuilder();
  fromMock.mockReturnValue(currentBuilder);
  builderResult.data = null;
  builderResult.error = null;
  builderResult.count = null;
});

const MEMBER_ID = "00000000-0000-0000-0000-000000000001" as unknown as MemberId;

describe("fetchMembersList", () => {
  it("member_list_view を SELECT し、フィルタ・ソート・ページネーションを反映する", async () => {
    builderResult.data = [];
    builderResult.count = 0;
    const { fetchMembersList } = await import("./member-client");

    const result = await fetchMembersList(
      { exp: "experienced", attendedRange: "2-5", q: "メール" },
      { key: "attended_count", dir: "desc" },
      { page: 2, perPage: 25 },
    );

    expect(fromMock).toHaveBeenCalledWith("member_list_view");
    expect(currentBuilder.select).toHaveBeenCalledWith(
      expect.stringContaining("attended_count"),
      { count: "exact" },
    );
    expect(currentBuilder.eq).toHaveBeenCalledWith(
      "experience_level",
      "experienced",
    );
    expect(currentBuilder.gte).toHaveBeenCalledWith("attended_count", 2);
    expect(currentBuilder.lte).toHaveBeenCalledWith("attended_count", 5);
    expect(currentBuilder.or).toHaveBeenCalledWith(
      expect.stringMatching(/display_name\.ilike\.%メール%/),
    );
    expect(currentBuilder.order).toHaveBeenCalledWith(
      "attended_count",
      expect.objectContaining({ ascending: false }),
    );
    // page 2, perPage 25 → range(25, 49)
    expect(currentBuilder.range).toHaveBeenCalledWith(25, 49);
    expect(result.ok).toBe(true);
  });

  it("first レンジは attended_count を 1 に固定する", async () => {
    builderResult.data = [];
    builderResult.count = 0;
    const { fetchMembersList } = await import("./member-client");
    await fetchMembersList(
      { attendedRange: "first" },
      { key: "last_attended_at", dir: "desc" },
      { page: 1 },
    );
    expect(currentBuilder.gte).toHaveBeenCalledWith("attended_count", 1);
    expect(currentBuilder.lte).toHaveBeenCalledWith("attended_count", 1);
  });

  it("11+ レンジは下限のみ", async () => {
    builderResult.data = [];
    builderResult.count = 0;
    const { fetchMembersList } = await import("./member-client");
    await fetchMembersList(
      { attendedRange: "11+" },
      { key: "last_attended_at", dir: "desc" },
      { page: 1 },
    );
    expect(currentBuilder.gte).toHaveBeenCalledWith("attended_count", 11);
    expect(currentBuilder.lte).not.toHaveBeenCalled();
  });

  it("lastPeriod 指定時は last_attended_at IS NOT NULL の条件も付与する", async () => {
    builderResult.data = [];
    builderResult.count = 0;
    const { fetchMembersList } = await import("./member-client");
    await fetchMembersList(
      { lastPeriod: "6m+" },
      { key: "last_attended_at", dir: "desc" },
      { page: 1 },
    );
    expect(currentBuilder.not).toHaveBeenCalledWith(
      "last_attended_at",
      "is",
      null,
    );
    expect(currentBuilder.lt).toHaveBeenCalled();
  });

  it("PERMISSION_DENIED を返す", async () => {
    builderResult.error = { code: "42501", message: "permission denied" };
    const { fetchMembersList } = await import("./member-client");
    const result = await fetchMembersList(
      {},
      { key: "last_attended_at", dir: "desc" },
      { page: 1 },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("PERMISSION_DENIED");
    }
  });

  it("NETWORK_ERROR を返す", async () => {
    fromMock.mockImplementationOnce(() => {
      throw new TypeError("Failed to fetch");
    });
    const { fetchMembersList } = await import("./member-client");
    const result = await fetchMembersList(
      {},
      { key: "last_attended_at", dir: "desc" },
      { page: 1 },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("NETWORK_ERROR");
    }
  });
});

describe("fetchMemberHistory", () => {
  it("member_history_view を member_id で SELECT し start_at desc で並べる", async () => {
    const rows: unknown[] = [];
    fromMock.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: rows, error: null }),
    });
    const { fetchMemberHistory } = await import("./member-client");
    const result = await fetchMemberHistory(MEMBER_ID);
    expect(fromMock).toHaveBeenCalledWith("member_history_view");
    expect(result.ok).toBe(true);
  });
});

describe("updateMemberAdminNote", () => {
  it("空文字は NULL に正規化して UPDATE する", async () => {
    const updateMock = vi.fn().mockReturnThis();
    const eqMock = vi.fn().mockResolvedValue({ error: null });
    fromMock.mockReturnValue({ update: updateMock, eq: eqMock });

    const { updateMemberAdminNote } = await import("./member-client");
    const result = await updateMemberAdminNote(MEMBER_ID, "");

    expect(fromMock).toHaveBeenCalledWith("members");
    expect(updateMock).toHaveBeenCalledWith({ admin_note: null });
    expect(result.ok).toBe(true);
  });

  it("値あり時はそのまま保存する", async () => {
    const updateMock = vi.fn().mockReturnThis();
    const eqMock = vi.fn().mockResolvedValue({ error: null });
    fromMock.mockReturnValue({ update: updateMock, eq: eqMock });

    const { updateMemberAdminNote } = await import("./member-client");
    const result = await updateMemberAdminNote(MEMBER_ID, "左利き / 体験申込");

    expect(updateMock).toHaveBeenCalledWith({
      admin_note: "左利き / 体験申込",
    });
    expect(result.ok).toBe(true);
  });

  it("RLS 拒否を PERMISSION_DENIED で返す", async () => {
    const eqMock = vi
      .fn()
      .mockResolvedValue({ error: { code: "42501", message: "denied" } });
    fromMock.mockReturnValue({
      update: vi.fn().mockReturnThis(),
      eq: eqMock,
    });

    const { updateMemberAdminNote } = await import("./member-client");
    const result = await updateMemberAdminNote(MEMBER_ID, "test");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("PERMISSION_DENIED");
    }
  });
});
