import { beforeEach, describe, expect, it, vi } from "vitest";
import type { IdentityDocumentId, MemberId } from "@high-q/shared";

interface BuilderResult {
  data: unknown;
  error: unknown;
}

const identityBuilderResult: BuilderResult = { data: null, error: null };
const reservationsBuilderResult: BuilderResult = { data: null, error: null };
const storageRemoveResult = { error: null as unknown };

function makeIdentityBuilder() {
  const b: Record<string, unknown> = {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockImplementation(async () => ({
      data: identityBuilderResult.data,
      error: identityBuilderResult.error,
    })),
  };
  return b;
}

function makeReservationsBuilder() {
  const b: Record<string, unknown> = {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    select: vi.fn().mockImplementation(async () => ({
      data: reservationsBuilderResult.data,
      error: reservationsBuilderResult.error,
    })),
  };
  return b;
}

let identityBuilder = makeIdentityBuilder();
let reservationsBuilder = makeReservationsBuilder();
const fromMock = vi.fn();
const storageRemove = vi.fn();
const storageFromMock = vi.fn();

const supabaseClient = {
  from: fromMock,
  storage: {
    from: storageFromMock,
  },
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
  storageFromMock.mockReturnValue({ remove: storageRemove });
  storageRemove.mockImplementation(async () => ({ ...storageRemoveResult }));

  identityBuilderResult.data = [
    {
      id: "doc-1",
      member: { display_name: "田中", email: "tanaka@example.com" },
    },
  ];
  identityBuilderResult.error = null;
  reservationsBuilderResult.data = [];
  reservationsBuilderResult.error = null;
  storageRemoveResult.error = null;
});

const DOC_ID = "doc-1" as IdentityDocumentId;
const MEM_ID = "mem-1" as MemberId;
const ADMIN_ID = "admin-1" as MemberId;

const baseInput = {
  documentId: DOC_ID,
  adminMemberId: ADMIN_ID,
  memberId: MEM_ID,
  storagePaths: {
    front: "mem-1/doc-1-front.jpg",
    back: "mem-1/doc-1-back.jpg",
  },
};

describe("maskDeleteIdentityDocument — Step 1: Storage 削除", () => {
  it("identity-documents バケットの remove() を front + back で呼ぶ", async () => {
    const { maskDeleteIdentityDocument } = await import(
      "./maskDeleteMutation"
    );
    await maskDeleteIdentityDocument(baseInput);
    expect(storageFromMock).toHaveBeenCalledWith("identity-documents");
    expect(storageRemove).toHaveBeenCalledWith([
      "mem-1/doc-1-front.jpg",
      "mem-1/doc-1-back.jpg",
    ]);
  });

  it("front のみのとき remove() に front 1 path だけ渡す", async () => {
    const { maskDeleteIdentityDocument } = await import(
      "./maskDeleteMutation"
    );
    await maskDeleteIdentityDocument({
      ...baseInput,
      storagePaths: { front: "mem-1/f.jpg", back: null },
    });
    expect(storageRemove).toHaveBeenCalledWith(["mem-1/f.jpg"]);
  });

  it("Storage 削除失敗で STORAGE_FAILED を返し、DB UPDATE は発行されない", async () => {
    storageRemoveResult.error = { message: "S3 timeout" };
    const { maskDeleteIdentityDocument } = await import(
      "./maskDeleteMutation"
    );
    const result = await maskDeleteIdentityDocument(baseInput);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("STORAGE_FAILED");
    }
    expect(identityBuilder.update).not.toHaveBeenCalled();
  });
});

describe("maskDeleteIdentityDocument — Step 2: DB UPDATE", () => {
  it("status='rejected' / 固定 rejection_reason / storage_path_*=NULL を UPDATE", async () => {
    const { maskDeleteIdentityDocument, MASK_DELETE_FIXED_REASON } =
      await import("./maskDeleteMutation");
    await maskDeleteIdentityDocument(baseInput);
    const arg = (identityBuilder.update as ReturnType<typeof vi.fn>).mock
      .calls[0]?.[0] as Record<string, unknown>;
    expect(arg.status).toBe("rejected");
    expect(arg.rejection_reason).toBe(MASK_DELETE_FIXED_REASON);
    expect(arg.storage_path_front).toBeNull();
    expect(arg.storage_path_back).toBeNull();
    expect(arg.reviewed_by).toBe(ADMIN_ID);
  });

  it("WHERE id=:id AND status='pending'", async () => {
    const { maskDeleteIdentityDocument } = await import(
      "./maskDeleteMutation"
    );
    await maskDeleteIdentityDocument(baseInput);
    const eqCall = identityBuilder.eq as ReturnType<typeof vi.fn>;
    expect(eqCall).toHaveBeenCalledWith("id", DOC_ID);
    expect(eqCall).toHaveBeenCalledWith("status", "pending");
  });

  it("UPDATE エラーで DB_FAILED_AFTER_STORAGE_DELETE", async () => {
    identityBuilderResult.error = { message: "permission denied" };
    const { maskDeleteIdentityDocument } = await import(
      "./maskDeleteMutation"
    );
    const result = await maskDeleteIdentityDocument(baseInput);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("DB_FAILED_AFTER_STORAGE_DELETE");
    }
  });

  it("0 行更新で ALREADY_REVIEWED + 連鎖キャンセルは発動しない", async () => {
    identityBuilderResult.data = [];
    const { maskDeleteIdentityDocument } = await import(
      "./maskDeleteMutation"
    );
    const result = await maskDeleteIdentityDocument(baseInput);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("ALREADY_REVIEWED");
    }
    expect(reservationsBuilder.update).not.toHaveBeenCalled();
  });
});

describe("maskDeleteIdentityDocument — Step 3: 連鎖予約キャンセル", () => {
  it("reservations UPDATE で IN ('reserved', 'waitlist') → 'cancelled'", async () => {
    reservationsBuilderResult.data = [{ id: "r-1" }];
    const { maskDeleteIdentityDocument } = await import(
      "./maskDeleteMutation"
    );
    await maskDeleteIdentityDocument(baseInput);
    expect(fromMock).toHaveBeenCalledWith("reservations");
    expect(
      (reservationsBuilder.update as ReturnType<typeof vi.fn>).mock.calls[0]?.[0],
    ).toEqual({ status: "cancelled" });
    expect(reservationsBuilder.eq).toHaveBeenCalledWith("member_id", MEM_ID);
    expect(reservationsBuilder.in).toHaveBeenCalledWith("status", [
      "reserved",
      "waitlist",
    ]);
  });

  it("正常系で cancelledCount + memberEmail + memberName を Result.value に含む", async () => {
    reservationsBuilderResult.data = [{ id: "r-1" }, { id: "r-2" }];
    const { maskDeleteIdentityDocument } = await import(
      "./maskDeleteMutation"
    );
    const result = await maskDeleteIdentityDocument(baseInput);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.cancelledCount).toBe(2);
      expect(result.value.memberEmail).toBe("tanaka@example.com");
      expect(result.value.memberName).toBe("田中");
    }
  });

  it("0 件キャンセルでも cancelledCount=0 で成功", async () => {
    reservationsBuilderResult.data = [];
    const { maskDeleteIdentityDocument } = await import(
      "./maskDeleteMutation"
    );
    const result = await maskDeleteIdentityDocument(baseInput);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.cancelledCount).toBe(0);
    }
  });

  it("reservations UPDATE エラーで CANCEL_FAILED_AFTER_MASK_DELETE", async () => {
    reservationsBuilderResult.error = { message: "network" };
    const { maskDeleteIdentityDocument } = await import(
      "./maskDeleteMutation"
    );
    const result = await maskDeleteIdentityDocument(baseInput);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("CANCEL_FAILED_AFTER_MASK_DELETE");
    }
  });
});
