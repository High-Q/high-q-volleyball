import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ref } from "vue";
import {
  pruneExpiredBookingDrafts,
  useBookingDraft,
} from "./useBookingDraft";

const FUTURE_END = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
const PAST_END = new Date(Date.now() - 60 * 1000).toISOString();
const KEY = (id: string) => `hq:reservation-booking:${id}`;

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  window.localStorage.clear();
});

describe("useBookingDraft - 復元", () => {
  it("ストレージに保存済の値を mount 時に復元する", () => {
    window.localStorage.setItem(
      KEY("ev-1"),
      JSON.stringify({
        guestCount: 2,
        note: "アレルギーあり",
        phone: undefined,
        eventEndAt: FUTURE_END,
        savedAt: new Date().toISOString(),
      }),
    );

    const eventId = ref("ev-1");
    const eventEndAt = ref<string | null>(FUTURE_END);
    const { draft } = useBookingDraft(eventId, eventEndAt);

    expect(draft.guestCount).toBe(2);
    expect(draft.note).toBe("アレルギーあり");
  });

  it("ストレージが空のときは初期値で起動する", () => {
    const eventId = ref("ev-1");
    const eventEndAt = ref<string | null>(FUTURE_END);
    const { draft } = useBookingDraft(eventId, eventEndAt);

    expect(draft.guestCount).toBe(0);
    expect(draft.note).toBe("");
    expect(draft.phone).toBeUndefined();
  });
});

describe("useBookingDraft - イベント別の独立保持", () => {
  it("異なる eventId のキーが独立して保持される", () => {
    window.localStorage.setItem(
      KEY("ev-A"),
      JSON.stringify({
        guestCount: 1,
        note: "A",
        eventEndAt: FUTURE_END,
        savedAt: new Date().toISOString(),
      }),
    );
    window.localStorage.setItem(
      KEY("ev-B"),
      JSON.stringify({
        guestCount: 3,
        note: "B",
        eventEndAt: FUTURE_END,
        savedAt: new Date().toISOString(),
      }),
    );

    const a = useBookingDraft(ref("ev-A"), ref<string | null>(FUTURE_END));
    const b = useBookingDraft(ref("ev-B"), ref<string | null>(FUTURE_END));

    expect(a.draft.guestCount).toBe(1);
    expect(a.draft.note).toBe("A");
    expect(b.draft.guestCount).toBe(3);
    expect(b.draft.note).toBe("B");
  });
});

describe("useBookingDraft - 開催終了超過で破棄", () => {
  it("eventEndAt が現在時刻より前なら復元せずキーを削除する", () => {
    window.localStorage.setItem(
      KEY("ev-old"),
      JSON.stringify({
        guestCount: 5,
        note: "old",
        eventEndAt: PAST_END,
        savedAt: new Date().toISOString(),
      }),
    );

    const { draft } = useBookingDraft(
      ref("ev-old"),
      ref<string | null>(PAST_END),
    );

    expect(draft.guestCount).toBe(0);
    expect(draft.note).toBe("");
    expect(window.localStorage.getItem(KEY("ev-old"))).toBeNull();
  });
});

describe("useBookingDraft - 自動保存と clear", () => {
  it("draft 変更を localStorage に保存する", async () => {
    const { draft } = useBookingDraft(
      ref("ev-1"),
      ref<string | null>(FUTURE_END),
    );

    draft.guestCount = 4;
    draft.note = "メモ";
    await Promise.resolve();
    await Promise.resolve();

    const stored = window.localStorage.getItem(KEY("ev-1"));
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored ?? "{}") as {
      guestCount: number;
      note: string;
    };
    expect(parsed.guestCount).toBe(4);
    expect(parsed.note).toBe("メモ");
  });

  it("clear() でストレージとメモリ双方を初期化する", async () => {
    const { draft, clear } = useBookingDraft(
      ref("ev-1"),
      ref<string | null>(FUTURE_END),
    );
    draft.guestCount = 2;
    await Promise.resolve();
    expect(window.localStorage.getItem(KEY("ev-1"))).not.toBeNull();

    clear();
    expect(draft.guestCount).toBe(0);
    expect(window.localStorage.getItem(KEY("ev-1"))).toBeNull();
  });
});

describe("pruneExpiredBookingDrafts", () => {
  it("過去 eventEndAt のキーのみを削除する", () => {
    window.localStorage.setItem(
      KEY("future"),
      JSON.stringify({
        guestCount: 1,
        note: "f",
        eventEndAt: FUTURE_END,
        savedAt: new Date().toISOString(),
      }),
    );
    window.localStorage.setItem(
      KEY("past"),
      JSON.stringify({
        guestCount: 1,
        note: "p",
        eventEndAt: PAST_END,
        savedAt: new Date().toISOString(),
      }),
    );

    pruneExpiredBookingDrafts();

    expect(window.localStorage.getItem(KEY("future"))).not.toBeNull();
    expect(window.localStorage.getItem(KEY("past"))).toBeNull();
  });

  it("対象 prefix 以外のキーには触れない", () => {
    window.localStorage.setItem("other-key", "value");
    pruneExpiredBookingDrafts();
    expect(window.localStorage.getItem("other-key")).toBe("value");
  });
});
