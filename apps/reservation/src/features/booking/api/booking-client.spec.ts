import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { unsafeEventId, unsafeMemberId } from "@high-q/shared";

/**
 * booking-client の supabase クエリビルダを mock する。
 * 各テストは insertSpec / updateSpec / fetchSpec を差し替えて挙動を制御する。
 */

type Spec = {
  data?: unknown;
  error?: { code?: string; message: string } | null;
};

const insertSpec: { current: Spec } = { current: { data: null, error: null } };
const fetchSpec: { current: Spec } = { current: { data: null, error: null } };
const updateSpec: { current: Spec } = { current: { data: null, error: null } };

function buildInsertChain() {
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
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(async () => updateSpec.current),
        })),
      })),
    })),
  };
}

vi.mock("@/shared/api/supabase", () => ({
  getSupabase: () => ({
    from: () => buildInsertChain(),
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
  updateSpec.current = { data: null, error: null };
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
    updateSpec.current = {
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
