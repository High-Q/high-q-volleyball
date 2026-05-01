import { describe, expect, it } from "vitest";
import {
  validateEventForm,
  emptyEventForm,
  type EventFormState,
} from "./eventFormSchema";

const VENUE_ID = "11111111-1111-4111-8111-111111111111";

function valid(overrides: Partial<EventFormState> = {}): EventFormState {
  return {
    name: "ゆる練 vol.43",
    date: "2026-05-12",
    startTime: "19:30",
    endTime: "21:30",
    venueId: VENUE_ID,
    fee: "1000",
    ...overrides,
  };
}

describe("validateEventForm — 必須項目", () => {
  it("全 valid なら errors なし (isValid=true)", () => {
    const r = validateEventForm(valid());
    expect(r.isValid).toBe(true);
    expect(Object.keys(r.errors)).toHaveLength(0);
  });

  it("name 空欄 → error 'タイトルを入力してください'", () => {
    const r = validateEventForm(valid({ name: "" }));
    expect(r.isValid).toBe(false);
    expect(r.errors.name).toBe("タイトルを入力してください");
  });

  it("name 空白のみ → error", () => {
    const r = validateEventForm(valid({ name: "   " }));
    expect(r.errors.name).toBe("タイトルを入力してください");
  });

  it("name 100 文字超 → error", () => {
    const r = validateEventForm(valid({ name: "a".repeat(101) }));
    expect(r.errors.name).toBe("タイトルは 100 文字以内で入力してください");
  });

  it("name 100 文字ちょうどは OK", () => {
    const r = validateEventForm(valid({ name: "a".repeat(100) }));
    expect(r.errors.name).toBeUndefined();
  });

  it("date 空欄 → error", () => {
    const r = validateEventForm(valid({ date: "" }));
    expect(r.errors.date).toBe("開催日を選択してください");
  });

  it("startTime 空欄 → error", () => {
    const r = validateEventForm(valid({ startTime: "" }));
    expect(r.errors.startTime).toBe("開始時刻を入力してください");
  });

  it("endTime 空欄 → error", () => {
    const r = validateEventForm(valid({ endTime: "" }));
    expect(r.errors.endTime).toBe("終了時刻を入力してください");
  });

  it("venueId 空欄 → error", () => {
    const r = validateEventForm(valid({ venueId: "" }));
    expect(r.errors.venueId).toBe("会場を選択してください");
  });
});

describe("validateEventForm — 整合性", () => {
  it("end <= start → endTime に error", () => {
    const r = validateEventForm(
      valid({ startTime: "21:00", endTime: "19:00" }),
    );
    expect(r.errors.endTime).toBe("終了は開始より後にしてください");
  });

  it("start = end → endTime に error", () => {
    const r = validateEventForm(
      valid({ startTime: "20:00", endTime: "20:00" }),
    );
    expect(r.errors.endTime).toBe("終了は開始より後にしてください");
  });

  it("start < end → OK", () => {
    const r = validateEventForm(valid());
    expect(r.errors.endTime).toBeUndefined();
  });
});

describe("validateEventForm — fee 任意", () => {
  it("fee 空欄 → OK（会場 default 継承）", () => {
    const r = validateEventForm(valid({ fee: "" }));
    expect(r.isValid).toBe(true);
    expect(r.errors.fee).toBeUndefined();
  });

  it("fee = '0' → OK", () => {
    const r = validateEventForm(valid({ fee: "0" }));
    expect(r.errors.fee).toBeUndefined();
  });

  it("fee 負数 → error", () => {
    const r = validateEventForm(valid({ fee: "-100" }));
    expect(r.errors.fee).toBe("参加費は 0 以上の整数で入力してください");
  });

  it("fee 非整数 → error", () => {
    const r = validateEventForm(valid({ fee: "1000.5" }));
    expect(r.errors.fee).toBe("参加費は 0 以上の整数で入力してください");
  });

  it("fee 非数値文字列 → error", () => {
    const r = validateEventForm(valid({ fee: "abc" }));
    expect(r.errors.fee).toBe("参加費は 0 以上の整数で入力してください");
  });
});

describe("emptyEventForm", () => {
  it("初期値は全フィールド空文字", () => {
    const f = emptyEventForm();
    expect(f.name).toBe("");
    expect(f.date).toBe("");
    expect(f.startTime).toBe("");
    expect(f.endTime).toBe("");
    expect(f.venueId).toBe("");
    expect(f.fee).toBe("");
  });

  it("emptyEventForm() は invalid（必須項目欠如）", () => {
    const r = validateEventForm(emptyEventForm());
    expect(r.isValid).toBe(false);
    expect(r.errors.name).toBeDefined();
    expect(r.errors.date).toBeDefined();
    expect(r.errors.venueId).toBeDefined();
  });
});
