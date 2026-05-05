import { beforeEach, describe, expect, it, vi } from "vitest";
import type { IdentityDocumentId, MemberId } from "@high-q/shared";

interface BuilderResult {
  data: unknown;
  error: unknown;
}

const identityBuilderResult: BuilderResult = {
  data: null,
  error: null,
};
const reservationsBuilderResult: BuilderResult = {
  data: null,
  error: null,
};

function makeIdentityBuilder() {
  const builder: Record<string, unknown> = {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockImplementation(async () => ({
      data: identityBuilderResult.data,
      error: identityBuilderResult.error,
    })),
  };
  return builder;
}

function makeReservationsBuilder() {
  const builder: Record<string, unknown> = {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    select: vi.fn().mockImplementation(async () => ({
      data: reservationsBuilderResult.data,
      error: reservationsBuilderResult.error,
    })),
  };
  return builder;
}

let identityBuilder = makeIdentityBuilder();
let reservationsBuilder = makeReservationsBuilder();
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
  identityBuilder = makeIdentityBuilder();
  reservationsBuilder = makeReservationsBuilder();
  fromMock.mockImplementation((table: string) => {
    if (table === "identity_documents") return identityBuilder;
    if (table === "reservations") return reservationsBuilder;
    throw new Error(`unexpected table ${table}`);
  });
  identityBuilderResult.data = [
    {
      id: "doc-1",
      member: { display_name: "田中", email: "tanaka@example.com" },
    },
  ];
  identityBuilderResult.error = null;
  reservationsBuilderResult.data = [];
  reservationsBuilderResult.error = null;
});

const DOC_ID = "doc-1" as IdentityDocumentId;
const MEM_ID = "mem-1" as MemberId;
const ADMIN_ID = "admin-1" as MemberId;

const baseInput = {
  documentId: DOC_ID,
  adminMemberId: ADMIN_ID,
  memberId: MEM_ID,
  reason: "画像が不鮮明",
};

describe("rejectIdentityDocument — バリデーション", () => {
  it("理由が空文字で INVALID_REASON を返す (mutation 発行されない)", async () => {
    const { rejectIdentityDocument } = await import("./rejectMutation");
    const result = await rejectIdentityDocument({
      ...baseInput,
      reason: "",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("INVALID_REASON");
    }
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("理由が空白のみで INVALID_REASON", async () => {
    const { rejectIdentityDocument } = await import("./rejectMutation");
    const result = await rejectIdentityDocument({
      ...baseInput,
      reason: "    ",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("INVALID_REASON");
    }
  });

  it("理由が 501 文字で INVALID_REASON", async () => {
    const { rejectIdentityDocument } = await import("./rejectMutation");
    const result = await rejectIdentityDocument({
      ...baseInput,
      reason: "あ".repeat(501),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("INVALID_REASON");
    }
  });

  it("理由が 500 文字 (境界値) で通過", async () => {
    const { rejectIdentityDocument } = await import("./rejectMutation");
    const result = await rejectIdentityDocument({
      ...baseInput,
      reason: "あ".repeat(500),
    });
    expect(result.ok).toBe(true);
  });
});

describe("rejectIdentityDocument — identity_documents UPDATE", () => {
  it("status='rejected' / rejection_reason / reviewed_at / reviewed_by を UPDATE する", async () => {
    const { rejectIdentityDocument } = await import("./rejectMutation");
    await rejectIdentityDocument(baseInput);
    const updateCall = identityBuilder.update as ReturnType<typeof vi.fn>;
    const arg = updateCall.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(arg.status).toBe("rejected");
    expect(arg.rejection_reason).toBe("画像が不鮮明");
    expect(arg.reviewed_by).toBe(ADMIN_ID);
    expect(typeof arg.reviewed_at).toBe("string");
  });

  it("WHERE id=:documentId AND status='pending' を含む", async () => {
    const { rejectIdentityDocument } = await import("./rejectMutation");
    await rejectIdentityDocument(baseInput);
    const eqCall = identityBuilder.eq as ReturnType<typeof vi.fn>;
    expect(eqCall).toHaveBeenCalledWith("id", DOC_ID);
    expect(eqCall).toHaveBeenCalledWith("status", "pending");
  });

  it("0 行更新で ALREADY_REVIEWED + 連鎖キャンセルは発動しない", async () => {
    identityBuilderResult.data = [];
    const { rejectIdentityDocument } = await import("./rejectMutation");
    const result = await rejectIdentityDocument(baseInput);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("ALREADY_REVIEWED");
    }
    expect(reservationsBuilder.update).not.toHaveBeenCalled();
  });

  it("UPDATE error で DB_FAILED + 連鎖キャンセルは発動しない", async () => {
    identityBuilderResult.error = { message: "permission denied" };
    const { rejectIdentityDocument } = await import("./rejectMutation");
    const result = await rejectIdentityDocument(baseInput);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("DB_FAILED");
    }
    expect(reservationsBuilder.update).not.toHaveBeenCalled();
  });
});

describe("rejectIdentityDocument — 連鎖予約キャンセル", () => {
  it("reservations UPDATE で status='cancelled' / member_id=:memberId / IN ('reserved','waitlist') を発行", async () => {
    reservationsBuilderResult.data = [{ id: "r-1" }, { id: "r-2" }];
    const { rejectIdentityDocument } = await import("./rejectMutation");
    await rejectIdentityDocument(baseInput);

    expect(fromMock).toHaveBeenCalledWith("reservations");
    const updateCall = reservationsBuilder.update as ReturnType<typeof vi.fn>;
    expect(updateCall.mock.calls[0]?.[0]).toEqual({ status: "cancelled" });
    expect(reservationsBuilder.eq).toHaveBeenCalledWith("member_id", MEM_ID);
    expect(reservationsBuilder.in).toHaveBeenCalledWith("status", [
      "reserved",
      "waitlist",
    ]);
  });

  it("正常系: cancelledCount + memberEmail + memberName を Result.value に含む", async () => {
    reservationsBuilderResult.data = [{ id: "r-1" }, { id: "r-2" }];
    const { rejectIdentityDocument } = await import("./rejectMutation");
    const result = await rejectIdentityDocument(baseInput);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.cancelledCount).toBe(2);
      expect(result.value.memberEmail).toBe("tanaka@example.com");
      expect(result.value.memberName).toBe("田中");
    }
  });

  it("0 件キャンセルでも cancelledCount=0 で成功", async () => {
    reservationsBuilderResult.data = [];
    const { rejectIdentityDocument } = await import("./rejectMutation");
    const result = await rejectIdentityDocument(baseInput);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.cancelledCount).toBe(0);
    }
  });

  it("reservations UPDATE エラーで CANCEL_FAILED_AFTER_REJECT", async () => {
    reservationsBuilderResult.error = { message: "network" };
    const { rejectIdentityDocument } = await import("./rejectMutation");
    const result = await rejectIdentityDocument(baseInput);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("CANCEL_FAILED_AFTER_REJECT");
    }
  });
});
