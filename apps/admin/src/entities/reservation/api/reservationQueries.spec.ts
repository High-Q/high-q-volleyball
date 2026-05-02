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
    order: vi.fn().mockImplementation(async () => ({
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
  builderResult.data = [];
  builderResult.error = null;
});

const EVENT_ID = "00000000-0000-0000-0000-000000000001" as unknown as EventId;

describe("getEventParticipants", () => {
  it("event_participants_view を event_id で SELECT する", async () => {
    const { getEventParticipants } = await import("./reservationQueries");

    await getEventParticipants(EVENT_ID);

    expect(fromMock).toHaveBeenCalledWith("event_participants_view");
    expect(currentBuilder.select).toHaveBeenCalledWith("*");
    expect(currentBuilder.eq).toHaveBeenCalledWith("event_id", EVENT_ID);
    expect(currentBuilder.order).toHaveBeenCalledWith("created_at", {
      ascending: true,
    });
  });

  it("成功時に行配列を返す", async () => {
    builderResult.data = [
      { reservation_id: "r1", display_name: "田中", is_first_time: true },
      { reservation_id: "r2", display_name: "佐藤", is_first_time: false },
    ];
    const { getEventParticipants } = await import("./reservationQueries");

    const result = await getEventParticipants(EVENT_ID);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(2);
      expect(result.value[0]!.display_name).toBe("田中");
    }
  });

  it("空配列で空 ok を返す", async () => {
    builderResult.data = [];
    const { getEventParticipants } = await import("./reservationQueries");

    const result = await getEventParticipants(EVENT_ID);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual([]);
    }
  });

  it("RLS 拒否で PERMISSION_DENIED を返す", async () => {
    builderResult.error = { code: "42501", message: "permission denied" };
    const { getEventParticipants } = await import("./reservationQueries");

    const result = await getEventParticipants(EVENT_ID);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("PERMISSION_DENIED");
    }
  });

  it("network error で NETWORK_ERROR を返す", async () => {
    fromMock.mockImplementationOnce(() => {
      throw new TypeError("Failed to fetch");
    });
    const { getEventParticipants } = await import("./reservationQueries");

    const result = await getEventParticipants(EVENT_ID);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("NETWORK_ERROR");
    }
  });
});
