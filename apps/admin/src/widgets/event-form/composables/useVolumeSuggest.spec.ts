import { describe, expect, it, vi, beforeEach } from "vitest";

const builderResult = {
  data: null as unknown,
  error: null as unknown,
};

function makeBuilder() {
  const builder: Record<string, unknown> = {
    select: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockImplementation(async () => ({ ...builderResult })),
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

describe("suggestNextVolume", () => {
  it("events 0 件 → undefined", async () => {
    builderResult.data = [];
    const { suggestNextVolume } = await import("./useVolumeSuggest");
    const result = await suggestNextVolume();
    expect(result).toBeUndefined();
  });

  it("events 1 件「ゆる練 vol.42」 → 'ゆる練 vol.43'", async () => {
    builderResult.data = [{ name: "ゆる練 vol.42" }];
    const { suggestNextVolume } = await import("./useVolumeSuggest");
    const result = await suggestNextVolume();
    expect(result).toBe("ゆる練 vol.43");
  });

  it("複数件で最大 vol を選ぶ", async () => {
    builderResult.data = [
      { name: "ゆる練 vol.40" },
      { name: "ゆる練 vol.43" },
      { name: "ゆる練 vol.42" },
    ];
    const { suggestNextVolume } = await import("./useVolumeSuggest");
    const result = await suggestNextVolume();
    expect(result).toBe("ゆる練 vol.44");
  });

  it("命名規則違反は無視する", async () => {
    builderResult.data = [
      { name: "GW 特別練習" },
      { name: "ゆる練 vol.41" },
      { name: "ゆる練 vol.42 修正版" }, // 語尾固定 regex で外す
    ];
    const { suggestNextVolume } = await import("./useVolumeSuggest");
    const result = await suggestNextVolume();
    expect(result).toBe("ゆる練 vol.42");
  });

  it("クエリ失敗時は undefined（throw しない）", async () => {
    builderResult.data = null;
    builderResult.error = { code: "PGRST", message: "boom" };
    const { suggestNextVolume } = await import("./useVolumeSuggest");
    const result = await suggestNextVolume();
    expect(result).toBeUndefined();
  });

  it("ネットワークエラーでも undefined（throw しない）", async () => {
    fromMock.mockImplementation(() => {
      throw new TypeError("network");
    });
    const { suggestNextVolume } = await import("./useVolumeSuggest");
    const result = await suggestNextVolume();
    expect(result).toBeUndefined();
  });
});
