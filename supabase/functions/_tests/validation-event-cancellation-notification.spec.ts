import { describe, expect, it } from "vitest";
import { validateEventCancellationNotificationPayload } from "../_shared/validation.ts";

const EVENT_ID = "11111111-2222-3333-4444-555555555555";
const MEMBER_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const MEMBER_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

const validBase = {
  eventId: EVENT_ID,
  eventName: "金曜の夜練",
  startAtJst: "2026年5月22日 (金) 19:30〜21:30",
  venueName: "新宿スポーツセンター",
  snapshotRecipients: [
    { memberId: MEMBER_A, email: "alice@example.com" },
    { memberId: MEMBER_B, email: "bob@example.com" },
  ],
};

describe("validateEventCancellationNotificationPayload", () => {
  it("正常系: 必須項目だけで受け付ける (organizerMessage 省略)", () => {
    const r = validateEventCancellationNotificationPayload(validBase);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.payload.eventId).toBe(EVENT_ID);
      expect(r.payload.snapshotRecipients).toHaveLength(2);
      expect(r.payload.organizerMessage).toBeUndefined();
    }
  });

  it("正常系: organizerMessage を受け付け、trim される", () => {
    const r = validateEventCancellationNotificationPayload({
      ...validBase,
      organizerMessage: "  雨天中止のためキャンセルします  ",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.payload.organizerMessage).toBe("雨天中止のためキャンセルします");
    }
  });

  it("organizerMessage が空文字 / 空白のみのときは undefined に正規化", () => {
    const r = validateEventCancellationNotificationPayload({
      ...validBase,
      organizerMessage: "   ",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.payload.organizerMessage).toBeUndefined();
    }
  });

  it("organizerMessage 500 文字超過で拒否", () => {
    const r = validateEventCancellationNotificationPayload({
      ...validBase,
      organizerMessage: "a".repeat(501),
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.some((e) => e.field === "organizerMessage")).toBe(true);
    }
  });

  it("organizerMessage 500 文字ちょうどは受け付ける", () => {
    const r = validateEventCancellationNotificationPayload({
      ...validBase,
      organizerMessage: "a".repeat(500),
    });
    expect(r.ok).toBe(true);
  });

  it("snapshotRecipients が空配列だと拒否", () => {
    const r = validateEventCancellationNotificationPayload({
      ...validBase,
      snapshotRecipients: [],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.some((e) => e.field === "snapshotRecipients")).toBe(true);
    }
  });

  it("snapshotRecipients が配列でないと拒否", () => {
    const r = validateEventCancellationNotificationPayload({
      ...validBase,
      snapshotRecipients: "not-array",
    });
    expect(r.ok).toBe(false);
  });

  it("eventId が UUID 形式でないと拒否", () => {
    const r = validateEventCancellationNotificationPayload({
      ...validBase,
      eventId: "not-a-uuid",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.some((e) => e.field === "eventId")).toBe(true);
    }
  });

  it("受信者 memberId が UUID 形式でないと拒否", () => {
    const r = validateEventCancellationNotificationPayload({
      ...validBase,
      snapshotRecipients: [{ memberId: "not-uuid", email: "alice@example.com" }],
    });
    expect(r.ok).toBe(false);
  });

  it("受信者 email の形式が不正だと拒否", () => {
    const r = validateEventCancellationNotificationPayload({
      ...validBase,
      snapshotRecipients: [{ memberId: MEMBER_A, email: "not-email" }],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(
        r.errors.some((e) => e.field.startsWith("snapshotRecipients[0].email")),
      ).toBe(true);
    }
  });

  it("同一 memberId の重複はサイレントに 1 件に重複排除される", () => {
    const r = validateEventCancellationNotificationPayload({
      ...validBase,
      snapshotRecipients: [
        { memberId: MEMBER_A, email: "alice@example.com" },
        { memberId: MEMBER_A, email: "alice@example.com" },
      ],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.payload.snapshotRecipients).toHaveLength(1);
    }
  });

  it("payload が object でないと拒否", () => {
    const r = validateEventCancellationNotificationPayload(null);
    expect(r.ok).toBe(false);
  });

  it("eventName / startAtJst / venueName が空だと拒否", () => {
    const r = validateEventCancellationNotificationPayload({
      ...validBase,
      eventName: "",
      startAtJst: "",
      venueName: "",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      const fields = r.errors.map((e) => e.field);
      expect(fields).toContain("eventName");
      expect(fields).toContain("startAtJst");
      expect(fields).toContain("venueName");
    }
  });
});
