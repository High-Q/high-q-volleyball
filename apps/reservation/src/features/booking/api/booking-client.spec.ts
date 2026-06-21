import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import {
  unsafeEventId,
  unsafeMemberId,
  unsafeReservationId,
} from "@high-q/shared";

/**
 * booking-client の supabase クエリビルダを mock する。
 * 各テストは insertSpec / updateSpec / fetchSpec / cancelUpdateSpec を差し替えて挙動を制御する。
 */

type Spec = {
  data?: unknown;
  error?: { code?: string; message: string } | null;
};

const insertSpec: { current: Spec } = { current: { data: null, error: null } };
const fetchSpec: { current: Spec } = { current: { data: null, error: null } };
const reactivateUpdateSpec: { current: Spec } = {
  current: { data: null, error: null },
};
const editUpdateSpec: { current: Spec } = {
  current: { data: null, error: null },
};
const cancelUpdateSpec: { current: Spec } = {
  current: { data: null, error: null },
};
const deleteSpec: { current: Spec } = {
  current: { data: null, error: null },
};

const updateCalls: { type: "edit" | "reactivate" | "cancel" | "unknown"; payload: unknown }[] = [];

function buildChain() {
  // .update(payload) → ターミナルが何かによって返値を決定する chainable mock
  const update = vi.fn((payload: Record<string, unknown>) => {
    let kind: "edit" | "reactivate" | "cancel" | "unknown" = "unknown";
    if ("guest_count" in payload && "note" in payload && !("status" in payload)) {
      kind = "edit";
    } else if (payload.status === "cancelled") {
      kind = "cancel";
    } else if (
      (payload.status === "reserved" || payload.status === "waitlist") &&
      "cancelled_at" in payload
    ) {
      kind = "reactivate";
    }
    updateCalls.push({ type: kind, payload });

    const eqChain: Record<string, unknown> = {};
    eqChain.eq = vi.fn(() => eqChain);
    eqChain.select = vi.fn(() => {
      // edit (updateReservation) と cancel (cancelReservation) は配列返し (.select() 末端)
      // reactivate は .single() を使う
      if (kind === "reactivate") {
        return {
          single: vi.fn(async () => reactivateUpdateSpec.current),
        };
      }
      const target =
        kind === "edit" ? editUpdateSpec.current : cancelUpdateSpec.current;
      // .select() は thenable でなければならない (await で即時消費される)
      return {
        then: (resolve: (v: Spec) => void) => resolve(target),
      };
    });
    return eqChain;
  });

  return {
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(async () => insertSpec.current),
      })),
    })),
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(async () => fetchSpec.current),
        })),
      })),
    })),
    update,
    delete: vi.fn(() => {
      const chain: Record<string, unknown> = {};
      chain.eq = vi.fn(() => chain);
      chain.select = vi.fn(() => ({
        then: (resolve: (v: Spec) => void) => resolve(deleteSpec.current),
      }));
      return chain;
    }),
  };
}

vi.mock("@/shared/api/supabase", () => ({
  getSupabase: () => ({
    from: () => buildChain(),
  }),
}));

const sampleInput = {
  eventId: unsafeEventId("ev-1"),
  memberId: unsafeMemberId("mb-1"),
  guestCount: 0,
  note: "",
  phoneAtBooking: "090-1111-2222",
};

const sampleRow = {
  id: "rs-1",
  event_id: "ev-1",
  member_id: "mb-1",
  status: "reserved",
  guest_count: 0,
  phone_at_booking: "090-1111-2222",
  note: null,
  checked_in_at: null,
  cancelled_at: null,
  created_at: "2026-05-06T00:00:00Z",
  updated_at: "2026-05-06T00:00:00Z",
};

beforeEach(() => {
  insertSpec.current = { data: null, error: null };
  fetchSpec.current = { data: null, error: null };
  reactivateUpdateSpec.current = { data: null, error: null };
  editUpdateSpec.current = { data: null, error: null };
  cancelUpdateSpec.current = { data: null, error: null };
  deleteSpec.current = { data: null, error: null };
  updateCalls.length = 0;
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("insertReservation - happy path", () => {
  it("INSERT 成功で Reservation を返す", async () => {
    insertSpec.current = { data: sampleRow, error: null };
    const { insertReservation } = await import("./booking-client");
    const r = await insertReservation(sampleInput);
    expect(r.id).toBe("rs-1");
    expect(r.status).toBe("reserved");
  });
});

describe("insertReservation - 重複 (UNIQUE 違反) ハンドリング", () => {
  it("既存行が cancelled なら UPDATE で 'reserved' に再活性化して返す", async () => {
    insertSpec.current = {
      data: null,
      error: { code: "23505", message: "duplicate key" },
    };
    fetchSpec.current = {
      data: { id: "rs-existing", status: "cancelled" },
      error: null,
    };
    reactivateUpdateSpec.current = {
      data: { ...sampleRow, id: "rs-existing", status: "reserved" },
      error: null,
    };
    const { insertReservation } = await import("./booking-client");
    const r = await insertReservation(sampleInput);
    expect(r.id).toBe("rs-existing");
    expect(r.status).toBe("reserved");
  });

  it("既存行が reserved のままなら 'duplicate' を投げる", async () => {
    insertSpec.current = {
      data: null,
      error: { code: "23505", message: "duplicate key" },
    };
    fetchSpec.current = {
      data: { id: "rs-existing", status: "reserved" },
      error: null,
    };
    const { insertReservation, BookingApiError } = await import(
      "./booking-client"
    );
    await expect(insertReservation(sampleInput)).rejects.toMatchObject({
      kind: "duplicate",
    });
    // 念のため型確認
    try {
      await insertReservation(sampleInput);
    } catch (e) {
      expect(e).toBeInstanceOf(BookingApiError);
    }
  });
});

describe("insertReservation - その他のエラー", () => {
  it("RLS 違反 (42501) を 'rls' で投げる", async () => {
    insertSpec.current = {
      data: null,
      error: { code: "42501", message: "rls violation" },
    };
    const { insertReservation } = await import("./booking-client");
    await expect(insertReservation(sampleInput)).rejects.toMatchObject({
      kind: "rls",
    });
  });

  it("その他の Postgrest エラーを 'network' で投げる", async () => {
    insertSpec.current = {
      data: null,
      error: { code: "08000", message: "network down" },
    };
    const { insertReservation } = await import("./booking-client");
    await expect(insertReservation(sampleInput)).rejects.toMatchObject({
      kind: "network",
    });
  });
});

describe("insertWaitlist - キャンセル待ち登録", () => {
  const waitlistRow = { ...sampleRow, status: "waitlist" };

  it("INSERT 成功で status='waitlist' の Reservation を返す", async () => {
    insertSpec.current = { data: waitlistRow, error: null };
    const { insertWaitlist } = await import("./booking-client");
    const r = await insertWaitlist(sampleInput);
    expect(r.id).toBe("rs-1");
    expect(r.status).toBe("waitlist");
  });

  it("既存行が cancelled なら UPDATE で 'waitlist' に再活性化して返す", async () => {
    insertSpec.current = {
      data: null,
      error: { code: "23505", message: "duplicate key" },
    };
    fetchSpec.current = {
      data: { id: "rs-existing", status: "cancelled" },
      error: null,
    };
    reactivateUpdateSpec.current = {
      data: { ...waitlistRow, id: "rs-existing" },
      error: null,
    };
    const { insertWaitlist } = await import("./booking-client");
    const r = await insertWaitlist(sampleInput);
    expect(r.id).toBe("rs-existing");
    expect(r.status).toBe("waitlist");

    const reactivateCall = updateCalls.find((c) => c.type === "reactivate");
    expect(reactivateCall?.payload).toMatchObject({
      status: "waitlist",
      cancelled_at: null,
    });
  });

  it("既存行が reserved なら 'duplicate' を投げる", async () => {
    insertSpec.current = {
      data: null,
      error: { code: "23505", message: "duplicate key" },
    };
    fetchSpec.current = {
      data: { id: "rs-existing", status: "reserved" },
      error: null,
    };
    const { insertWaitlist } = await import("./booking-client");
    await expect(insertWaitlist(sampleInput)).rejects.toMatchObject({
      kind: "duplicate",
    });
  });

  it("既存行が waitlist なら 'duplicate' を投げる (二重登録防止)", async () => {
    insertSpec.current = {
      data: null,
      error: { code: "23505", message: "duplicate key" },
    };
    fetchSpec.current = {
      data: { id: "rs-existing", status: "waitlist" },
      error: null,
    };
    const { insertWaitlist } = await import("./booking-client");
    await expect(insertWaitlist(sampleInput)).rejects.toMatchObject({
      kind: "duplicate",
    });
  });

  it("RLS 違反 (42501) を 'rls' で投げる", async () => {
    insertSpec.current = {
      data: null,
      error: { code: "42501", message: "rls violation" },
    };
    const { insertWaitlist } = await import("./booking-client");
    await expect(insertWaitlist(sampleInput)).rejects.toMatchObject({
      kind: "rls",
    });
  });
});

describe("updateReservation - 同伴者数 / 連絡事項の編集", () => {
  const editInput = {
    reservationId: unsafeReservationId("rs-1"),
    memberId: unsafeMemberId("mb-1"),
    guestCount: 2,
    note: "アレルギー: 卵",
  };

  it("自分の reserved 行を更新成功で Reservation を返す", async () => {
    editUpdateSpec.current = {
      data: [{ ...sampleRow, guest_count: 2, note: "アレルギー: 卵" }],
      error: null,
    };
    const { updateReservation } = await import("./booking-client");
    const r = await updateReservation(editInput);

    expect(r.id).toBe("rs-1");
    expect(r.guestCount).toBe(2);
    expect(r.note).toBe("アレルギー: 卵");
  });

  it("status を payload に含めず guest_count と note のみを送る", async () => {
    editUpdateSpec.current = {
      data: [sampleRow],
      error: null,
    };
    const { updateReservation } = await import("./booking-client");
    await updateReservation(editInput);

    const editCall = updateCalls.find((c) => c.type === "edit");
    expect(editCall).toBeDefined();
    expect(editCall?.payload).toEqual({
      guest_count: 2,
      note: "アレルギー: 卵",
    });
  });

  it("空文字 note は NULL として送信する", async () => {
    editUpdateSpec.current = {
      data: [sampleRow],
      error: null,
    };
    const { updateReservation } = await import("./booking-client");
    await updateReservation({ ...editInput, note: "" });

    const editCall = updateCalls.find((c) => c.type === "edit");
    expect(editCall?.payload).toEqual({
      guest_count: 2,
      note: null,
    });
  });

  it("0 行更新 (他人の id 改ざん / 既に cancelled) は 'rls' で投げる", async () => {
    editUpdateSpec.current = {
      data: [],
      error: null,
    };
    const { updateReservation } = await import("./booking-client");
    await expect(updateReservation(editInput)).rejects.toMatchObject({
      kind: "rls",
    });
  });

  it("RLS WITH CHECK 違反 (42501) を 'rls' で投げる", async () => {
    editUpdateSpec.current = {
      data: null,
      error: { code: "42501", message: "rls" },
    };
    const { updateReservation } = await import("./booking-client");
    await expect(updateReservation(editInput)).rejects.toMatchObject({
      kind: "rls",
    });
  });

  it("ネットワークエラーを 'network' で投げる", async () => {
    editUpdateSpec.current = {
      data: null,
      error: { code: "08000", message: "down" },
    };
    const { updateReservation } = await import("./booking-client");
    await expect(updateReservation(editInput)).rejects.toMatchObject({
      kind: "network",
    });
  });
});

describe("cancelWaitlistReservation - キャンセル待ちの取り消し (DELETE)", () => {
  const wlId = unsafeReservationId("rs-wl-1");

  it("waitlist 行を DELETE 成功 (1 行) で解決する", async () => {
    deleteSpec.current = { data: [{ id: "rs-wl-1" }], error: null };
    const { cancelWaitlistReservation } = await import("./booking-client");
    await expect(cancelWaitlistReservation(wlId)).resolves.toBeUndefined();
  });

  it("0 行削除 (他人の id / 既に waitlist でない) は 'rls' で投げる", async () => {
    deleteSpec.current = { data: [], error: null };
    const { cancelWaitlistReservation } = await import("./booking-client");
    await expect(cancelWaitlistReservation(wlId)).rejects.toMatchObject({
      kind: "rls",
    });
  });

  it("RLS 違反 (42501) を 'rls' で投げる", async () => {
    deleteSpec.current = {
      data: null,
      error: { code: "42501", message: "rls" },
    };
    const { cancelWaitlistReservation } = await import("./booking-client");
    await expect(cancelWaitlistReservation(wlId)).rejects.toMatchObject({
      kind: "rls",
    });
  });
});
