import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EventId } from "@high-q/shared";

const builderResult = {
  data: null as unknown,
  error: null as unknown,
};

function makeBuilder() {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockImplementation(async () => ({
      data: builderResult.data,
      error: builderResult.error,
    })),
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
});

const ID = "00000000-0000-0000-0000-000000000001" as unknown as EventId;

describe("getEventDetail", () => {
  it("event_detail_view を id で SELECT する", async () => {
    builderResult.data = {
      id: ID,
      name: "ゆる練 vol.42",
      capacity: null,
      reserved_count: 16,
      checked_in_count: 4,
      first_time_count: 2,
      waitlist_count: 0,
    };
    const { getEventDetail } = await import("./eventDetailQueries");

    const result = await getEventDetail(ID);

    expect(fromMock).toHaveBeenCalledWith("event_detail_view");
    expect(currentBuilder.select).toHaveBeenCalledWith("*");
    expect(currentBuilder.eq).toHaveBeenCalledWith("id", ID);
    expect(currentBuilder.maybeSingle).toHaveBeenCalled();
    expect(result.ok).toBe(true);
  });

  it("成功時に行を value で返す", async () => {
    const row = {
      id: ID,
      name: "test",
      reserved_count: 5,
      checked_in_count: 2,
      first_time_count: 1,
      waitlist_count: 0,
    };
    builderResult.data = row;
    const { getEventDetail } = await import("./eventDetailQueries");

    const result = await getEventDetail(ID);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual(row);
    }
  });

  it("0 行で EVENT_NOT_FOUND を返す", async () => {
    builderResult.data = null;
    const { getEventDetail } = await import("./eventDetailQueries");

    const result = await getEventDetail(ID);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("EVENT_NOT_FOUND");
    }
  });

  it("RLS 拒否で PERMISSION_DENIED を返す", async () => {
    builderResult.error = { code: "42501", message: "permission denied" };
    const { getEventDetail } = await import("./eventDetailQueries");

    const result = await getEventDetail(ID);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("PERMISSION_DENIED");
    }
  });

  it("network error で NETWORK_ERROR を返す", async () => {
    fromMock.mockImplementationOnce(() => {
      throw new TypeError("Failed to fetch");
    });
    const { getEventDetail } = await import("./eventDetailQueries");

    const result = await getEventDetail(ID);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("NETWORK_ERROR");
    }
  });

  it("その他のエラーで SERVER_ERROR を返す", async () => {
    builderResult.error = { code: "XX000", message: "something broke" };
    const { getEventDetail } = await import("./eventDetailQueries");

    const result = await getEventDetail(ID);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("SERVER_ERROR");
    }
  });
});
