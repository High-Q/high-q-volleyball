import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const supabaseMock = {
  auth: {
    getSession: vi.fn(),
  },
  functions: {
    invoke: vi.fn(),
  },
};

vi.mock("./supabase", () => ({
  getSupabase: () => supabaseMock,
}));

let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  supabaseMock.auth.getSession.mockReset();
  supabaseMock.functions.invoke.mockReset();
  consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  consoleWarnSpy.mockRestore();
});

import { triggerIdentityDocumentPendingNotification } from "./identity-document-notification";

const ID = "11111111-2222-3333-4444-555555555555";

describe("triggerIdentityDocumentPendingNotification", () => {
  it("happy path: { identityDocumentId } payload で Edge Function を呼ぶ", async () => {
    supabaseMock.auth.getSession.mockResolvedValue({
      data: { session: { access_token: "token-abc" } },
    });
    supabaseMock.functions.invoke.mockResolvedValue({
      data: { ok: true },
      error: null,
    });

    await triggerIdentityDocumentPendingNotification(ID);

    expect(supabaseMock.functions.invoke).toHaveBeenCalledTimes(1);
    expect(supabaseMock.functions.invoke).toHaveBeenCalledWith(
      "send-identity-document-pending-notification",
      { body: { identityDocumentId: ID } },
    );
  });

  it("セッション欠落時は invoke をスキップして warn を残す", async () => {
    supabaseMock.auth.getSession.mockResolvedValue({
      data: { session: null },
    });

    await triggerIdentityDocumentPendingNotification(ID);

    expect(supabaseMock.functions.invoke).not.toHaveBeenCalled();
    expect(consoleWarnSpy).toHaveBeenCalled();
  });

  it("invoke がエラーを返しても throw せず warn を残す", async () => {
    supabaseMock.auth.getSession.mockResolvedValue({
      data: { session: { access_token: "token-abc" } },
    });
    supabaseMock.functions.invoke.mockResolvedValue({
      data: null,
      error: { message: "network failed" },
    });

    await expect(
      triggerIdentityDocumentPendingNotification(ID),
    ).resolves.toBeUndefined();
    expect(consoleWarnSpy).toHaveBeenCalled();
  });

  it("invoke が throw しても外に伝搬させず warn を残す", async () => {
    supabaseMock.auth.getSession.mockResolvedValue({
      data: { session: { access_token: "token-abc" } },
    });
    supabaseMock.functions.invoke.mockRejectedValue(new Error("boom"));

    await expect(
      triggerIdentityDocumentPendingNotification(ID),
    ).resolves.toBeUndefined();
    expect(consoleWarnSpy).toHaveBeenCalled();
  });

  it("Edge Function が { ok: false } を返したとき warn を残すが throw しない", async () => {
    supabaseMock.auth.getSession.mockResolvedValue({
      data: { session: { access_token: "token-abc" } },
    });
    supabaseMock.functions.invoke.mockResolvedValue({
      data: { ok: false, error: "mail-failed" },
      error: null,
    });

    await triggerIdentityDocumentPendingNotification(ID);
    expect(consoleWarnSpy).toHaveBeenCalled();
  });
});
