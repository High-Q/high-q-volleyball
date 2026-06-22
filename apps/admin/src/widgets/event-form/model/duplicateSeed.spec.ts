import { describe, expect, it } from "vitest";
import type { Event } from "@high-q/shared";
import { resolveDuplicateName, seedFromEvent } from "./duplicateSeed";

const VENUE_ID = "11111111-1111-4111-8111-111111111111";
const EVENT_ID = "22222222-2222-4222-8222-222222222222";

function buildEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: EVENT_ID as unknown as Event["id"],
    name: "ゆる練 vol.42",
    description: null,
    start_at: "2026-05-12T19:30:00+09:00",
    end_at: "2026-05-12T21:30:00+09:00",
    venue_id: VENUE_ID as unknown as Event["venue_id"],
    fee: 1000,
    capacity: null,
    email_note: null,
    visibility: "published",
    status: "scheduled",
    cancel_deadline: null,
    created_by: null,
    created_at: "2026-05-01T00:00:00Z",
    updated_at: "2026-05-01T00:00:00Z",
    ...overrides,
  };
}

describe("seedFromEvent", () => {
  it("会場 / 開始時刻 / 終了時刻 / 参加費を複製元から引き継ぐ", () => {
    const seed = seedFromEvent(buildEvent(), "ゆる練 vol.43");
    expect(seed.venueId).toBe(VENUE_ID);
    expect(seed.startTime).toBe("19:30");
    expect(seed.endTime).toBe("21:30");
    expect(seed.fee).toBe("1000");
  });

  it("開催日は空にする（必ず選び直させる）", () => {
    const seed = seedFromEvent(buildEvent(), "ゆる練 vol.43");
    expect(seed.date).toBe("");
  });

  it("タイトルは引数 nextName を採用する", () => {
    const seed = seedFromEvent(buildEvent(), "ゆる練 vol.43");
    expect(seed.name).toBe("ゆる練 vol.43");
  });

  it("参加費 NULL は空文字にする", () => {
    const seed = seedFromEvent(buildEvent({ fee: null }), "ゆる練 vol.43");
    expect(seed.fee).toBe("");
  });
});

describe("resolveDuplicateName", () => {
  it("ゆる練 連番シリーズなら nextVolume を採用する", () => {
    const name = resolveDuplicateName(
      buildEvent({ name: "ゆる練 vol.42" }),
      "ゆる練 vol.46",
    );
    expect(name).toBe("ゆる練 vol.46");
  });

  it("連番形式でないタイトルは複製元の名称をそのまま引き継ぐ", () => {
    const name = resolveDuplicateName(
      buildEvent({ name: "夏合宿 2026" }),
      "ゆる練 vol.46",
    );
    expect(name).toBe("夏合宿 2026");
  });

  it("nextVolume が undefined（採番取得失敗）なら複製元タイトルをそのまま返す", () => {
    const name = resolveDuplicateName(
      buildEvent({ name: "ゆる練 vol.42" }),
      undefined,
    );
    expect(name).toBe("ゆる練 vol.42");
  });

  it("ゆる練 シリーズでない vol 付きタイトルには ゆる練 の番号を当てない", () => {
    const name = resolveDuplicateName(
      buildEvent({ name: "練習会 vol.3" }),
      "ゆる練 vol.46",
    );
    expect(name).toBe("練習会 vol.3");
  });
});
