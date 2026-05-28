import { describe, expect, it } from "vitest";
import { validateIdentityDocumentPendingNotificationPayload } from "../_shared/validation.ts";

describe("validateIdentityDocumentPendingNotificationPayload", () => {
  it("正常系: UUID を受け付ける", () => {
    const r = validateIdentityDocumentPendingNotificationPayload({
      identityDocumentId: "11111111-2222-3333-4444-555555555555",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.payload.identityDocumentId).toBe(
        "11111111-2222-3333-4444-555555555555",
      );
    }
  });

  it("identityDocumentId が UUID 形式でないと拒否", () => {
    const r = validateIdentityDocumentPendingNotificationPayload({
      identityDocumentId: "not-a-uuid",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.some((e) => e.field === "identityDocumentId")).toBe(true);
    }
  });

  it("identityDocumentId が空文字だと拒否", () => {
    const r = validateIdentityDocumentPendingNotificationPayload({
      identityDocumentId: "",
    });
    expect(r.ok).toBe(false);
  });

  it("identityDocumentId が欠落していると拒否", () => {
    const r = validateIdentityDocumentPendingNotificationPayload({});
    expect(r.ok).toBe(false);
  });

  it("payload が object でないと拒否", () => {
    const r = validateIdentityDocumentPendingNotificationPayload(null);
    expect(r.ok).toBe(false);
  });

  it("identityDocumentId の前後空白を trim する", () => {
    const r = validateIdentityDocumentPendingNotificationPayload({
      identityDocumentId: "  11111111-2222-3333-4444-555555555555  ",
    });
    expect(r.ok).toBe(true);
  });
});
