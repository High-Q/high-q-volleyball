import { describe, expect, it } from "vitest";
import { validateReservationNotificationPayload } from "../_shared/validation.ts";

describe("validateReservationNotificationPayload", () => {
  it("正常系: UUID + 'confirmed' を受け付ける", () => {
    const r = validateReservationNotificationPayload({
      reservationId: "11111111-2222-3333-4444-555555555555",
      eventType: "confirmed",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.payload.reservationId).toBe(
        "11111111-2222-3333-4444-555555555555",
      );
      expect(r.payload.eventType).toBe("confirmed");
    }
  });

  it("正常系: UUID + 'cancelled' を受け付ける", () => {
    const r = validateReservationNotificationPayload({
      reservationId: "ffffffff-ffff-ffff-ffff-ffffffffffff",
      eventType: "cancelled",
    });
    expect(r.ok).toBe(true);
  });

  it("正常系: UUID + 'updated' を受け付ける", () => {
    const r = validateReservationNotificationPayload({
      reservationId: "11111111-2222-3333-4444-555555555555",
      eventType: "updated",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.payload.eventType).toBe("updated");
    }
  });

  it("reservationId が UUID 形式でないと拒否", () => {
    const r = validateReservationNotificationPayload({
      reservationId: "not-a-uuid",
      eventType: "confirmed",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.some((e) => e.field === "reservationId")).toBe(true);
    }
  });

  it("eventType が想定外の値だと拒否", () => {
    const r = validateReservationNotificationPayload({
      reservationId: "11111111-2222-3333-4444-555555555555",
      eventType: "expired",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.some((e) => e.field === "eventType")).toBe(true);
    }
  });

  it("payload が object でないと拒否", () => {
    const r = validateReservationNotificationPayload(null);
    expect(r.ok).toBe(false);
  });

  it("reservationId の前後空白を trim する", () => {
    const r = validateReservationNotificationPayload({
      reservationId: "  11111111-2222-3333-4444-555555555555  ",
      eventType: "confirmed",
    });
    expect(r.ok).toBe(true);
  });
});
