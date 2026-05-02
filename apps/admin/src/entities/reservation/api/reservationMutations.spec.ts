import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReservationId } from "@high-q/shared";

const builderResult = {
  error: null as unknown,
  data: [{ id: "x" }] as unknown[] | null,
};

let updatePayload: Record<string, unknown> | null = null;
let eqCalls: Array<[string, unknown]> = [];
let isCalls: Array<[string, unknown]> = [];

function makeBuilder() {
  const builder: Record<string, unknown> = {
    update: vi.fn().mockImplementation((payload: Record<string, unknown>) => {
      updatePayload = payload;
      return builder;
    }),
    eq: vi.fn().mockImplementation((col: string, val: unknown) => {
      eqCalls.push([col, val]);
      return builder;
    }),
    is: vi.fn().mockImplementation((col: string, val: unknown) => {
      isCalls.push([col, val]);
      return builder;
    }),
    select: vi.fn().mockImplementation(async () => ({
      error: builderResult.error,
      data: builderResult.data,
    })),
  };
  return builder;
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
  builderResult.error = null;
  builderResult.data = [{ id: "x" }];
  updatePayload = null;
  eqCalls = [];
  isCalls = [];
});

const RID = "00000000-0000-0000-0000-00000000a001" as unknown as ReservationId;

describe("toggleCheckin", () => {
  describe("未 → 済", () => {
    it("status=attended + checked_in_at=now() で UPDATE する", async () => {
      const { toggleCheckin } = await import("./reservationMutations");

      await toggleCheckin(RID, false);

      expect(updatePayload).not.toBeNull();
      expect(updatePayload!.status).toBe("attended");
      expect(updatePayload!.checked_in_at).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
      );
    });

    it("WHERE 句に status='reserved' AND checked_in_at IS NULL を含める", async () => {
      const { toggleCheckin } = await import("./reservationMutations");

      await toggleCheckin(RID, false);

      expect(eqCalls).toContainEqual(["id", RID]);
      expect(eqCalls).toContainEqual(["status", "reserved"]);
      expect(isCalls).toContainEqual(["checked_in_at", null]);
    });

    it("成功時に ok を返す", async () => {
      const { toggleCheckin } = await import("./reservationMutations");

      const result = await toggleCheckin(RID, false);

      expect(result.ok).toBe(true);
    });
  });

  describe("済 → 未", () => {
    it("status=reserved + checked_in_at=null で UPDATE する", async () => {
      const { toggleCheckin } = await import("./reservationMutations");

      await toggleCheckin(RID, true);

      expect(updatePayload).not.toBeNull();
      expect(updatePayload!.status).toBe("reserved");
      expect(updatePayload!.checked_in_at).toBeNull();
    });

    it("WHERE 句に status='attended' を含める", async () => {
      const { toggleCheckin } = await import("./reservationMutations");

      await toggleCheckin(RID, true);

      expect(eqCalls).toContainEqual(["id", RID]);
      expect(eqCalls).toContainEqual(["status", "attended"]);
      expect(isCalls).toEqual([]);
    });
  });

  it("WHERE 条件不一致 (count=0) で ALREADY_UPDATED を返す", async () => {
    builderResult.data = [];
    const { toggleCheckin } = await import("./reservationMutations");

    const result = await toggleCheckin(RID, false);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("ALREADY_UPDATED");
    }
  });

  it("network error で NETWORK_ERROR を返す", async () => {
    fromMock.mockImplementationOnce(() => {
      throw new TypeError("Failed to fetch");
    });
    const { toggleCheckin } = await import("./reservationMutations");

    const result = await toggleCheckin(RID, false);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("NETWORK_ERROR");
    }
  });

  it("RLS 拒否で PERMISSION_DENIED を返す", async () => {
    builderResult.error = { code: "42501", message: "permission denied" };
    const { toggleCheckin } = await import("./reservationMutations");

    const result = await toggleCheckin(RID, false);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("PERMISSION_DENIED");
    }
  });
});

describe("updateGuestCount", () => {
  it("guest_count を nextCount で UPDATE する", async () => {
    const eqMock = vi.fn().mockImplementation(async () => ({ error: null }));
    const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
    fromMock.mockReturnValueOnce({ update: updateMock });
    const { updateGuestCount } = await import("./reservationMutations");

    const result = await updateGuestCount(RID, 2);

    expect(updateMock).toHaveBeenCalledWith({ guest_count: 2 });
    expect(eqMock).toHaveBeenCalledWith("id", RID);
    expect(result.ok).toBe(true);
  });

  it("nextCount=0 でも UPDATE する", async () => {
    const eqMock = vi.fn().mockImplementation(async () => ({ error: null }));
    const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
    fromMock.mockReturnValueOnce({ update: updateMock });
    const { updateGuestCount } = await import("./reservationMutations");

    const result = await updateGuestCount(RID, 0);

    expect(updateMock).toHaveBeenCalledWith({ guest_count: 0 });
    expect(result.ok).toBe(true);
  });

  it("負数は SERVER_ERROR で client side 拒否", async () => {
    const { updateGuestCount } = await import("./reservationMutations");
    const result = await updateGuestCount(RID, -1);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("SERVER_ERROR");
      expect(result.error.message).toMatch(/out of range/);
    }
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("6 以上は SERVER_ERROR で client side 拒否", async () => {
    const { updateGuestCount } = await import("./reservationMutations");
    const result = await updateGuestCount(RID, 6);
    expect(result.ok).toBe(false);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("network error で NETWORK_ERROR を返す", async () => {
    fromMock.mockImplementationOnce(() => {
      throw new TypeError("Failed to fetch");
    });
    const { updateGuestCount } = await import("./reservationMutations");
    const result = await updateGuestCount(RID, 2);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("NETWORK_ERROR");
    }
  });

  it("RLS 拒否で PERMISSION_DENIED を返す", async () => {
    const eqMock = vi.fn().mockImplementation(async () => ({
      error: { code: "42501", message: "permission denied" },
    }));
    fromMock.mockReturnValueOnce({
      update: vi.fn().mockReturnValue({ eq: eqMock }),
    });
    const { updateGuestCount } = await import("./reservationMutations");
    const result = await updateGuestCount(RID, 2);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("PERMISSION_DENIED");
    }
  });
});

describe("cancelByAdmin", () => {
  it("status='cancelled' で UPDATE する", async () => {
    const { cancelByAdmin } = await import("./reservationMutations");

    await cancelByAdmin(RID);

    expect(updatePayload).toEqual({ status: "cancelled" });
    expect(eqCalls).toContainEqual(["id", RID]);
  });

  it("成功時に ok を返す", async () => {
    // cancelByAdmin は select() / count を見ないので update.eq 後の結果を制御
    // currentBuilder の eq() の結果は thenable ではないが、awaitable な挙動が必要
    // → mutation の eq の戻り値は builder で、await は最終 chain で発生する
    // 本実装は select を呼ばないため、eq() の戻り値が thenable である必要がある
    const eqMock = vi.fn().mockImplementation(async () => ({
      error: null,
    }));
    fromMock.mockReturnValueOnce({
      update: vi.fn().mockReturnValue({ eq: eqMock }),
    });
    const { cancelByAdmin } = await import("./reservationMutations");

    const result = await cancelByAdmin(RID);

    expect(result.ok).toBe(true);
  });

  it("network error で NETWORK_ERROR を返す", async () => {
    fromMock.mockImplementationOnce(() => {
      throw new TypeError("Failed to fetch");
    });
    const { cancelByAdmin } = await import("./reservationMutations");

    const result = await cancelByAdmin(RID);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("NETWORK_ERROR");
    }
  });

  it("RLS 拒否で PERMISSION_DENIED を返す", async () => {
    const eqMock = vi.fn().mockImplementation(async () => ({
      error: { code: "42501", message: "permission denied" },
    }));
    fromMock.mockReturnValueOnce({
      update: vi.fn().mockReturnValue({ eq: eqMock }),
    });
    const { cancelByAdmin } = await import("./reservationMutations");

    const result = await cancelByAdmin(RID);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("PERMISSION_DENIED");
    }
  });
});
