import { beforeEach, describe, expect, it, vi } from "vitest";
import type { IdentityDocumentId, MemberId } from "@high-q/shared";

const builderResult = {
  data: null as unknown,
  error: null as unknown,
};

function makeBuilder() {
  const builder: Record<string, unknown> = {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockImplementation(async () => ({ ...builderResult })),
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

beforeEach(() => {
  vi.clearAllMocks();
  currentBuilder = makeBuilder();
  fromMock.mockReturnValue(currentBuilder);
  builderResult.data = [{ id: "doc-1" }];
  builderResult.error = null;
});

const DOC_ID = "doc-1" as IdentityDocumentId;
const ADMIN_ID = "admin-1" as MemberId;

describe("approveIdentityDocument", () => {
  it("identity_documents を UPDATE する", async () => {
    const { approveIdentityDocument } = await import("./approveMutation");
    await approveIdentityDocument(DOC_ID, ADMIN_ID);
    expect(fromMock).toHaveBeenCalledWith("identity_documents");
    const updateCall = currentBuilder.update as ReturnType<typeof vi.fn>;
    const arg = updateCall.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(arg.status).toBe("approved");
    expect(arg.reviewed_by).toBe(ADMIN_ID);
    expect(typeof arg.reviewed_at).toBe("string");
  });

  it("WHERE id=:documentId を含む", async () => {
    const { approveIdentityDocument } = await import("./approveMutation");
    await approveIdentityDocument(DOC_ID, ADMIN_ID);
    const eqCall = currentBuilder.eq as ReturnType<typeof vi.fn>;
    expect(eqCall).toHaveBeenCalledWith("id", DOC_ID);
  });

  it("WHERE status='pending' を含む (二重承認防御)", async () => {
    const { approveIdentityDocument } = await import("./approveMutation");
    await approveIdentityDocument(DOC_ID, ADMIN_ID);
    const eqCall = currentBuilder.eq as ReturnType<typeof vi.fn>;
    expect(eqCall).toHaveBeenCalledWith("status", "pending");
  });

  it("正常系で Result.ok を返す", async () => {
    builderResult.data = [{ id: "doc-1" }];
    const { approveIdentityDocument } = await import("./approveMutation");
    const result = await approveIdentityDocument(DOC_ID, ADMIN_ID);
    expect(result.ok).toBe(true);
  });

  it("0 行更新 (data=[]) で ALREADY_REVIEWED を返す", async () => {
    builderResult.data = [];
    const { approveIdentityDocument } = await import("./approveMutation");
    const result = await approveIdentityDocument(DOC_ID, ADMIN_ID);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("ALREADY_REVIEWED");
    }
  });

  it("error がある場合 DB_FAILED を返す", async () => {
    builderResult.error = { message: "permission denied" };
    const { approveIdentityDocument } = await import("./approveMutation");
    const result = await approveIdentityDocument(DOC_ID, ADMIN_ID);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("DB_FAILED");
    }
  });
});
