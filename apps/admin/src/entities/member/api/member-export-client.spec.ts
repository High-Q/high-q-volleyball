import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MemberId } from "@high-q/shared";

const builderResult = {
  data: null as unknown,
  error: null as unknown,
};

function makeBuilder() {
  const builder: Record<string, unknown> = {
    select: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
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

describe("fetchMembersForExport", () => {
  it("members 実テーブルを id in (...) で SELECT し名簿フィールドを取得する", async () => {
    const { fetchMembersForExport } = await import("./member-client");
    await fetchMembersForExport(ids);
    expect(fromMock).toHaveBeenCalledWith("members");
    const selectArg = (currentBuilder.select as ReturnType<typeof vi.fn>).mock
      .calls[0]?.[0] as string;
    expect(selectArg).toContain("last_name");
    expect(selectArg).toContain("first_name");
    expect(selectArg).toContain("phone");
    expect(selectArg).toContain("birthday");
    expect(currentBuilder.in).toHaveBeenCalledWith("id", ["mem-1", "mem-2"]);
  });

  it("memberIds が空のときはクエリを投げず空配列を返す", async () => {
    const { fetchMembersForExport } = await import("./member-client");
    const result = await fetchMembersForExport([]);
    expect(fromMock).not.toHaveBeenCalled();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toEqual([]);
  });

  it("正常系で会員行を返す（phone / birthday が NULL でも通る）", async () => {
    const { fetchMembersForExport } = await import("./member-client");
    builderResult.data = [
      {
        id: "mem-1",
        last_name: "田中",
        first_name: "太郎",
        phone: "090-1234-5678",
        birthday: "1984-04-01",
      },
      {
        id: "mem-2",
        last_name: "鈴木",
        first_name: "一郎",
        phone: null,
        birthday: null,
      },
    ];
    const result = await fetchMembersForExport(ids);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(2);
      expect(result.value[1]?.phone).toBeNull();
      expect(result.value[1]?.birthday).toBeNull();
    }
  });

  it("PERMISSION_DENIED (42501) を分類する", async () => {
    const { fetchMembersForExport } = await import("./member-client");
    builderResult.error = { code: "42501", message: "permission denied" };
    const result = await fetchMembersForExport(ids);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("PERMISSION_DENIED");
  });

  it("その他のエラーは SERVER_ERROR を返す", async () => {
    const { fetchMembersForExport } = await import("./member-client");
    builderResult.error = { message: "boom" };
    const result = await fetchMembersForExport(ids);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("SERVER_ERROR");
  });
});
