import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";

/**
 * 関連:
 *   openspec/changes/admin-venues-crud-screen/specs/admin-venues-crud/spec.md
 *   openspec/changes/admin-venues-crud-screen/design.md (D1, D2)
 */

const { fetchVenuesMock, createVenueMock, updateVenueMock, deleteVenueMock } =
  vi.hoisted(() => ({
    fetchVenuesMock: vi.fn(),
    createVenueMock: vi.fn(),
    updateVenueMock: vi.fn(),
    deleteVenueMock: vi.fn(),
  }));

vi.mock("@/entities/venue", () => ({
  fetchVenues: fetchVenuesMock,
  createVenue: createVenueMock,
  updateVenue: updateVenueMock,
  deleteVenue: deleteVenueMock,
}));

import { useVenuesMaster, NEW_ID } from "./useVenuesMaster";
import type { Venue } from "@high-q/shared";

function venue(over: Partial<Venue>): Venue {
  return {
    id: "v-1" as unknown as Venue["id"],
    name: "有明会場",
    address: "江東区有明",
    default_fee: 500,
    access_note: null,
    map_url: null,
    meeting_point: "現地集合",
    is_primary: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-06-15T00:00:00Z",
    ...over,
  };
}

const LIST: Venue[] = [
  venue({ id: "v-1" as unknown as Venue["id"], name: "有明会場", is_primary: true, default_fee: 500 }),
  venue({ id: "v-2" as unknown as Venue["id"], name: "亀戸SC", is_primary: false, default_fee: null, address: "江東区亀戸" }),
];

beforeEach(() => {
  vi.clearAllMocks();
  fetchVenuesMock.mockResolvedValue({ ok: true, value: LIST.map((v) => ({ ...v })) });
  vi.spyOn(window, "confirm").mockReturnValue(true);
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("useVenuesMaster — 読込と選択", () => {
  it("reload で一覧取得し先頭を選択する", async () => {
    const m = useVenuesMaster();
    await m.reload();
    expect(m.totalCount.value).toBe(2);
    expect(m.selId.value).toBe("v-1");
    expect(m.draft.value?.name).toBe("有明会場");
    expect(m.draft.value?.feeType).toBe("fixed");
  });

  it("items の feeLabel: 固定額は ¥、都度は『都度』、メインフラグ反映", async () => {
    const m = useVenuesMaster();
    await m.reload();
    const ariake = m.items.value.find((i) => i.id === "v-1")!;
    const kameido = m.items.value.find((i) => i.id === "v-2")!;
    expect(ariake.isMain).toBe(true);
    expect(ariake.feeLabel).toBe("¥500");
    expect(kameido.isVariable).toBe(true);
    expect(kameido.feeLabel).toBe("都度");
  });

  it("検索で会場名・住所を部分一致フィルタ", async () => {
    const m = useVenuesMaster();
    await m.reload();
    m.query.value = "亀戸";
    await nextTick();
    expect(m.filteredCount.value).toBe(1);
    expect(m.items.value[0]!.id).toBe("v-2");
  });

  it("select で draft を切り替える", async () => {
    const m = useVenuesMaster();
    await m.reload();
    m.select("v-2");
    expect(m.selId.value).toBe("v-2");
    expect(m.draft.value?.name).toBe("亀戸SC");
  });

  it("dirty 中の select は confirm 拒否で移動しない", async () => {
    const m = useVenuesMaster();
    await m.reload();
    m.setField("name", "編集中");
    expect(m.dirty.value).toBe(true);
    (window.confirm as ReturnType<typeof vi.fn>).mockReturnValue(false);
    m.select("v-2");
    expect(m.selId.value).toBe("v-1");
  });
});

describe("useVenuesMaster — 新規追加と保存", () => {
  it("addVenue で未保存ドラフト (id=null) を選択する", async () => {
    const m = useVenuesMaster();
    await m.reload();
    m.addVenue();
    expect(m.selId.value).toBe(NEW_ID);
    expect(m.draft.value?.id).toBeNull();
    expect(m.draft.value?.feeType).toBe("fixed");
    expect(m.totalCount.value).toBe(3);
    expect(m.items.value.some((i) => i.id === NEW_ID)).toBe(true);
  });

  it("会場名空の save は createVenue を呼ばず displayErrors を解禁", async () => {
    const m = useVenuesMaster();
    await m.reload();
    m.addVenue();
    m.setField("name", "");
    await m.save();
    expect(createVenueMock).not.toHaveBeenCalled();
    expect(m.displayErrors.value.name).toBeTruthy();
  });

  it("新規 save は createVenue を呼び reload し成功トースト", async () => {
    createVenueMock.mockResolvedValue({
      ok: true,
      value: venue({ id: "v-new" as unknown as Venue["id"], name: "新会場" }),
    });
    fetchVenuesMock.mockResolvedValueOnce({ ok: true, value: LIST.map((v) => ({ ...v })) });
    const m = useVenuesMaster();
    await m.reload();
    m.addVenue();
    m.setField("name", "新会場");
    fetchVenuesMock.mockResolvedValueOnce({
      ok: true,
      value: [...LIST, venue({ id: "v-new" as unknown as Venue["id"], name: "新会場" })],
    });
    await m.save();
    expect(createVenueMock).toHaveBeenCalledTimes(1);
    expect(m.selId.value).toBe("v-new");
    expect(m.toast.value).toContain("保存しました");
  });

  it("編集 save は updateVenue を allowlist patch で呼ぶ", async () => {
    updateVenueMock.mockResolvedValue({ ok: true, value: venue({ name: "改名" }) });
    const m = useVenuesMaster();
    await m.reload();
    m.setField("name", "改名");
    m.setField("feeType", "variable");
    await m.save();
    expect(updateVenueMock).toHaveBeenCalledTimes(1);
    const [, patch] = updateVenueMock.mock.calls[0]!;
    expect(patch.name).toBe("改名");
    expect(patch.default_fee).toBeNull();
    expect("meeting_point" in patch).toBe(false);
  });

  it("会場名重複は保存失敗トースト", async () => {
    updateVenueMock.mockResolvedValue({
      ok: false,
      error: { code: "DUPLICATE_NAME", message: "dup" },
    });
    const m = useVenuesMaster();
    await m.reload();
    m.setField("name", "亀戸SC");
    await m.save();
    expect(m.toast.value).toContain("同名の会場");
  });
});

describe("useVenuesMaster — 削除", () => {
  it("未参照会場の削除で deleteVenue を呼び reload", async () => {
    deleteVenueMock.mockResolvedValue({ ok: true, value: undefined });
    const m = useVenuesMaster();
    await m.reload();
    await m.remove();
    expect(deleteVenueMock).toHaveBeenCalledWith("v-1");
    expect(m.toast.value).toContain("削除しました");
  });

  it("参照中会場 (VENUE_IN_USE) は使用中メッセージを出し削除しない", async () => {
    deleteVenueMock.mockResolvedValue({
      ok: false,
      error: { code: "VENUE_IN_USE", message: "fk" },
    });
    const m = useVenuesMaster();
    await m.reload();
    await m.remove();
    expect(m.toast.value).toContain("使用中");
    expect(m.totalCount.value).toBe(2);
  });

  it("未保存の新規の削除は DB を触らず破棄", async () => {
    const m = useVenuesMaster();
    await m.reload();
    m.addVenue();
    await m.remove();
    expect(deleteVenueMock).not.toHaveBeenCalled();
    expect(m.selId.value).toBe("v-1");
  });
});
