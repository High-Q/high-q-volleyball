import { describe, expect, it } from "vitest";
import type { Venue } from "@high-q/shared";
import {
  draftToInsert,
  draftToUpdate,
  emptyDraft,
  formatYmdJst,
  validateDraft,
  venueToDraft,
  type VenueDraft,
} from "./venueDraft";

/**
 * 関連:
 *   openspec/changes/admin-venues-crud-screen/specs/admin-venues-crud/spec.md
 */

const SAMPLE: Venue = {
  id: "v-1" as unknown as Venue["id"],
  name: "有明会場",
  address: "東京都江東区有明 1-8-14",
  default_fee: 500,
  access_note: "ゆりかもめ徒歩3分",
  map_url: "35.6357, 139.7902",
  meeting_point: "現地集合",
  is_primary: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-06-15T03:00:00Z",
};

function draft(overrides: Partial<VenueDraft> = {}): VenueDraft {
  return { ...emptyDraft(), name: "会場", ...overrides };
}

describe("venueToDraft", () => {
  it("固定額会場を VM に写像する", () => {
    const d = venueToDraft(SAMPLE);
    expect(d.feeType).toBe("fixed");
    expect(d.fee).toBe(500);
    expect(d.geo).toBe("35.6357, 139.7902");
    expect(d.access).toBe("ゆりかもめ徒歩3分");
    expect(d.main).toBe(true);
    expect(d.updated).toBe("2026-06-15");
  });

  it("default_fee=NULL は feeType=variable に写像する", () => {
    const d = venueToDraft({ ...SAMPLE, default_fee: null });
    expect(d.feeType).toBe("variable");
    expect(d.fee).toBeNull();
  });

  it("NULL 列は空文字に正規化する", () => {
    const d = venueToDraft({
      ...SAMPLE,
      address: null,
      access_note: null,
      map_url: null,
    });
    expect(d.address).toBe("");
    expect(d.access).toBe("");
    expect(d.geo).toBe("");
  });
});

describe("draftToInsert / draftToUpdate", () => {
  it("固定額は default_fee に金額を入れる", () => {
    const payload = draftToInsert(draft({ feeType: "fixed", fee: 1000 }));
    expect(payload.default_fee).toBe(1000);
    expect(payload.is_primary).toBe(false);
  });

  it("都度設定は default_fee=NULL", () => {
    const payload = draftToInsert(draft({ feeType: "variable", fee: 1000 }));
    expect(payload.default_fee).toBeNull();
  });

  it("空文字フィールドは NULL に変換する", () => {
    const payload = draftToInsert(draft({ address: "  ", access: "", geo: "" }));
    expect(payload.address).toBeNull();
    expect(payload.access_note).toBeNull();
    expect(payload.map_url).toBeNull();
  });

  it("update payload は meeting_point を含まない（既存値保持）", () => {
    const payload = draftToUpdate(draft());
    expect("meeting_point" in payload).toBe(false);
  });

  it("insert payload も meeting_point を含まない（DB default に委ねる）", () => {
    const payload = draftToInsert(draft());
    expect("meeting_point" in payload).toBe(false);
  });

  it("geo は map_url に写像する", () => {
    const payload = draftToUpdate(draft({ geo: "https://maps.example/x" }));
    expect(payload.map_url).toBe("https://maps.example/x");
  });
});

describe("validateDraft", () => {
  it("会場名があり固定額に金額があれば valid", () => {
    expect(validateDraft(draft({ feeType: "fixed", fee: 500 })).isValid).toBe(true);
  });

  it("会場名空は name エラー", () => {
    const r = validateDraft(draft({ name: "  " }));
    expect(r.isValid).toBe(false);
    expect(r.errors.name).toBeTruthy();
  });

  it("固定額で金額未入力は fee エラー", () => {
    const r = validateDraft(draft({ feeType: "fixed", fee: null }));
    expect(r.errors.fee).toBeTruthy();
  });

  it("固定額で負/非整数は fee エラー", () => {
    expect(validateDraft(draft({ feeType: "fixed", fee: -1 })).errors.fee).toBeTruthy();
    expect(validateDraft(draft({ feeType: "fixed", fee: 1.5 })).errors.fee).toBeTruthy();
  });

  it("都度設定は金額未入力でも valid", () => {
    expect(validateDraft(draft({ feeType: "variable", fee: null })).isValid).toBe(true);
  });
});

describe("formatYmdJst", () => {
  it("ISO を JST の YYYY-MM-DD に整形", () => {
    expect(formatYmdJst("2026-06-15T20:00:00Z")).toBe("2026-06-16");
  });
  it("空入力は空文字", () => {
    expect(formatYmdJst("")).toBe("");
  });
});
