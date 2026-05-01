import { describe, it, expectTypeOf } from "vitest";
import type {
  Event,
  EventInsert,
  EventUpdate,
  EventVisibility,
  EventStatus,
} from "./entities.js";
import type { VenueId } from "./ids.js";

/**
 * `EventUpdate` 型に対する型レベル契約テスト。
 *
 * 関連: openspec/changes/admin-events-crud-screen/specs/admin-events-crud/spec.md
 *       (即時公開ポリシー D3 / MVP1 スコープ縮小)
 */

describe("EventUpdate 型契約", () => {
  it("全フィールドが optional", () => {
    // 何も指定しない object は EventUpdate に代入可能
    expectTypeOf<{}>().toMatchTypeOf<EventUpdate>();
    expectTypeOf<EventUpdate>().toMatchTypeOf<{}>();
  });

  it("admin が編集できる 5 列を全て optional で持つ", () => {
    const patch: EventUpdate = {
      name: "ゆる練 vol.43",
      start_at: "2026-05-12T19:30:00+09:00",
      end_at: "2026-05-12T21:30:00+09:00",
      venue_id: "11111111-1111-4111-8111-111111111111" as VenueId,
      fee: 1000,
    };
    expectTypeOf(patch).toMatchTypeOf<EventUpdate>();
  });

  it("fee は null も許容（会場 default_fee 継承）", () => {
    const patch: EventUpdate = { fee: null };
    expectTypeOf(patch).toMatchTypeOf<EventUpdate>();
  });

  it("visibility は EventUpdate に含まれない（D3 即時公開ポリシー）", () => {
    type Keys = keyof EventUpdate;
    expectTypeOf<Keys>().not.toEqualTypeOf<Keys | "visibility">();
    // 別表現: 'visibility' は EventUpdate のキーではない
    type HasVisibility = "visibility" extends keyof EventUpdate ? true : false;
    expectTypeOf<HasVisibility>().toEqualTypeOf<false>();
  });

  it("capacity は EventUpdate に含まれない（MVP1 押し下げ）", () => {
    type HasCapacity = "capacity" extends keyof EventUpdate ? true : false;
    expectTypeOf<HasCapacity>().toEqualTypeOf<false>();
  });

  it("description は EventUpdate に含まれない（MVP1 押し下げ）", () => {
    type HasDesc = "description" extends keyof EventUpdate ? true : false;
    expectTypeOf<HasDesc>().toEqualTypeOf<false>();
  });

  it("cancel_deadline は EventUpdate に含まれない（MVP1 押し下げ）", () => {
    type HasCancel = "cancel_deadline" extends keyof EventUpdate ? true : false;
    expectTypeOf<HasCancel>().toEqualTypeOf<false>();
  });

  it("status は EventUpdate に含まれない（中止/終了は別 Issue）", () => {
    type HasStatus = "status" extends keyof EventUpdate ? true : false;
    expectTypeOf<HasStatus>().toEqualTypeOf<false>();
  });
});

describe("EventInsert 型は visibility / capacity / description を引き続き許容", () => {
  it("INSERT は visibility 指定可（admin-events-crud で 'published' 固定投入する）", () => {
    const insert: EventInsert = {
      name: "x",
      start_at: "2026-05-12T19:30:00+09:00",
      end_at: "2026-05-12T21:30:00+09:00",
      venue_id: "11111111-1111-4111-8111-111111111111" as VenueId,
      visibility: "published" satisfies EventVisibility,
      capacity: null,
      description: null,
      cancel_deadline: null,
    };
    expectTypeOf(insert).toMatchTypeOf<EventInsert>();
  });
});

describe("Event entity 型は変更なし", () => {
  it("Event 型は thumbnail_path を持たない（本 change で追加しない）", () => {
    type HasThumb = "thumbnail_path" extends keyof Event ? true : false;
    expectTypeOf<HasThumb>().toEqualTypeOf<false>();
  });

  it("Event 型は visibility / status / capacity を持つ", () => {
    expectTypeOf<Event["visibility"]>().toEqualTypeOf<EventVisibility>();
    expectTypeOf<Event["status"]>().toEqualTypeOf<EventStatus>();
    expectTypeOf<Event["capacity"]>().toEqualTypeOf<number | null>();
  });
});
