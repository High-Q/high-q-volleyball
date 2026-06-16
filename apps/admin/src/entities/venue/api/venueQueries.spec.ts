import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * venueQueries の CRUD + エラー分類テスト。
 *
 * 関連:
 *   openspec/changes/admin-venues-crud-screen/specs/admin-venues-crud/spec.md
 *   openspec/changes/admin-venues-crud-screen/design.md (D1, D2, D3)
 *
 * モック方針は entities/event/api/eventQueries.spec.ts を踏襲する。
 */

const builderResult = {
  data: null as unknown,
  error: null as unknown,
};

function makeBuilder() {
  const builder: Record<string, unknown> = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    single: vi.fn().mockImplementation(async () => ({
      data: builderResult.data,
      error: builderResult.error,
    })),
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

const SAMPLE_VENUE_ID = "11111111-1111-4111-8111-111111111111";
const SAMPLE_VENUE = {
  id: SAMPLE_VENUE_ID,
  name: "亀戸スポーツセンター",
  address: "江東区亀戸",
  default_fee: 500,
  access_note: null,
  map_url: null,
  meeting_point: "現地集合",
  is_primary: false,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  currentBuilder = makeBuilder();
  fromMock.mockReturnValue(currentBuilder);
  builderResult.data = [];
  builderResult.error = null;
});

describe("fetchVenues", () => {
  it("venues を name 昇順で SELECT する", async () => {
    currentBuilder.order = vi
      .fn()
      .mockResolvedValue({ data: [SAMPLE_VENUE], error: null });
    const { fetchVenues } = await import("./venueQueries");
    const result = await fetchVenues();
    expect(fromMock).toHaveBeenCalledWith("venues");
    expect(currentBuilder.select).toHaveBeenCalledWith("*");
    expect(currentBuilder.order).toHaveBeenCalledWith("name", {
      ascending: true,
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toHaveLength(1);
  });

  it("取得エラーは SERVER_ERROR を返す", async () => {
    currentBuilder.order = vi
      .fn()
      .mockResolvedValue({ data: null, error: { message: "boom" } });
    const { fetchVenues } = await import("./venueQueries");
    const result = await fetchVenues();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("SERVER_ERROR");
  });
});

describe("fetchVenue", () => {
  it("id で単一会場を取得する", async () => {
    builderResult.data = SAMPLE_VENUE;
    const { fetchVenue } = await import("./venueQueries");
    const result = await fetchVenue(SAMPLE_VENUE_ID as never);
    expect(fromMock).toHaveBeenCalledWith("venues");
    expect(currentBuilder.eq).toHaveBeenCalledWith("id", SAMPLE_VENUE_ID);
    expect(currentBuilder.maybeSingle).toHaveBeenCalled();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value?.name).toBe("亀戸スポーツセンター");
  });

  it("行が無い場合は ok(null) を返す", async () => {
    builderResult.data = null;
    const { fetchVenue } = await import("./venueQueries");
    const result = await fetchVenue(SAMPLE_VENUE_ID as never);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBeNull();
  });
});

describe("createVenue", () => {
  it("会場を INSERT して返す", async () => {
    builderResult.data = SAMPLE_VENUE;
    const { createVenue } = await import("./venueQueries");
    const result = await createVenue({ name: "新会場", is_primary: false });
    expect(fromMock).toHaveBeenCalledWith("venues");
    expect(currentBuilder.insert).toHaveBeenCalledTimes(1);
    expect(currentBuilder.single).toHaveBeenCalled();
    expect(result.ok).toBe(true);
  });

  it("is_primary=true の作成時は既存メインを先に解除する (D1)", async () => {
    builderResult.data = { ...SAMPLE_VENUE, is_primary: true };
    const { createVenue } = await import("./venueQueries");
    await createVenue({ name: "新メイン会場", is_primary: true });
    // 既存メイン解除の UPDATE が走る
    expect(currentBuilder.update).toHaveBeenCalledWith({ is_primary: false });
    // 解除条件は is_primary=true の行
    expect(currentBuilder.eq).toHaveBeenCalledWith("is_primary", true);
    // その後 INSERT
    expect(currentBuilder.insert).toHaveBeenCalledTimes(1);
  });

  it("is_primary=false の作成時は解除 UPDATE を呼ばない", async () => {
    builderResult.data = SAMPLE_VENUE;
    const { createVenue } = await import("./venueQueries");
    await createVenue({ name: "普通会場", is_primary: false });
    expect(currentBuilder.update).not.toHaveBeenCalled();
  });

  it("会場名重複 (23505) は DUPLICATE_NAME を返す", async () => {
    builderResult.data = null;
    builderResult.error = {
      code: "23505",
      message: "duplicate key value violates unique constraint venues_name_key",
    };
    const { createVenue } = await import("./venueQueries");
    const result = await createVenue({ name: "既存名" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("DUPLICATE_NAME");
  });

  it("RLS エラー (42501) は PERMISSION_DENIED を返す", async () => {
    builderResult.data = null;
    builderResult.error = { code: "42501", message: "permission denied" };
    const { createVenue } = await import("./venueQueries");
    const result = await createVenue({ name: "x" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("PERMISSION_DENIED");
  });
});

describe("updateVenue", () => {
  it("allowlist 列のみで UPDATE する", async () => {
    builderResult.data = SAMPLE_VENUE;
    const { updateVenue } = await import("./venueQueries");
    await updateVenue(SAMPLE_VENUE_ID as never, {
      name: "改名",
      address: "新住所",
      default_fee: 800,
      // @ts-expect-error 攻撃的呼び出しシミュレーション（許可列外）
      id: "evil",
      created_at: "evil",
    });
    const payload = (currentBuilder.update as ReturnType<typeof vi.fn>).mock
      .calls.at(-1)![0];
    expect(payload.name).toBe("改名");
    expect(payload.address).toBe("新住所");
    expect(payload.default_fee).toBe(800);
    expect("id" in payload).toBe(false);
    expect("created_at" in payload).toBe(false);
    expect(currentBuilder.eq).toHaveBeenCalledWith("id", SAMPLE_VENUE_ID);
  });

  it("is_primary=true の編集時は自分以外の既存メインを解除する (D1)", async () => {
    builderResult.data = { ...SAMPLE_VENUE, is_primary: true };
    const { updateVenue } = await import("./venueQueries");
    await updateVenue(SAMPLE_VENUE_ID as never, { is_primary: true });
    // 解除 UPDATE は is_primary:false を自分以外に適用
    const firstUpdate = (currentBuilder.update as ReturnType<typeof vi.fn>).mock
      .calls[0]![0];
    expect(firstUpdate).toEqual({ is_primary: false });
    expect(currentBuilder.neq).toHaveBeenCalledWith("id", SAMPLE_VENUE_ID);
    expect(currentBuilder.eq).toHaveBeenCalledWith("is_primary", true);
    // 自分自身の UPDATE は 2 回目
    expect(
      (currentBuilder.update as ReturnType<typeof vi.fn>).mock.calls.length,
    ).toBe(2);
  });

  it("is_primary を含まない編集は解除 UPDATE を呼ばない", async () => {
    builderResult.data = SAMPLE_VENUE;
    const { updateVenue } = await import("./venueQueries");
    await updateVenue(SAMPLE_VENUE_ID as never, { name: "改名のみ" });
    expect(currentBuilder.neq).not.toHaveBeenCalled();
    expect(
      (currentBuilder.update as ReturnType<typeof vi.fn>).mock.calls.length,
    ).toBe(1);
  });

  it("設定失敗時はエラーを返す", async () => {
    builderResult.data = null;
    builderResult.error = { code: "42501", message: "permission denied" };
    const { updateVenue } = await import("./venueQueries");
    const result = await updateVenue(SAMPLE_VENUE_ID as never, {
      name: "x",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("PERMISSION_DENIED");
  });
});

describe("deleteVenue", () => {
  it("delete().eq('id', ...) を呼ぶ", async () => {
    currentBuilder.eq = vi.fn().mockResolvedValue({ error: null });
    const { deleteVenue } = await import("./venueQueries");
    const result = await deleteVenue(SAMPLE_VENUE_ID as never);
    expect(fromMock).toHaveBeenCalledWith("venues");
    expect(currentBuilder.delete).toHaveBeenCalledTimes(1);
    expect(currentBuilder.eq).toHaveBeenCalledWith("id", SAMPLE_VENUE_ID);
    expect(result.ok).toBe(true);
  });

  it("参照中会場の削除 (FK 違反 23503) は VENUE_IN_USE を返す", async () => {
    currentBuilder.eq = vi.fn().mockResolvedValue({
      error: {
        code: "23503",
        message:
          'update or delete on table "venues" violates foreign key constraint',
      },
    });
    const { deleteVenue } = await import("./venueQueries");
    const result = await deleteVenue(SAMPLE_VENUE_ID as never);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("VENUE_IN_USE");
  });

  it("RLS エラー (42501) は PERMISSION_DENIED を返す", async () => {
    currentBuilder.eq = vi.fn().mockResolvedValue({
      error: { code: "42501", message: "permission denied" },
    });
    const { deleteVenue } = await import("./venueQueries");
    const result = await deleteVenue(SAMPLE_VENUE_ID as never);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("PERMISSION_DENIED");
  });
});
