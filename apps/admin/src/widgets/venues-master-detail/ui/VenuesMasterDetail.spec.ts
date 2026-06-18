import { mount, flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * #155 モバイル master-detail のビュー切替を検証する。
 * useVenuesMaster は API に触れるため最小スタブでモックする。
 */
const { state } = vi.hoisted(() => ({ state: { selectId: vi.fn() } }));

vi.mock("../composables/useVenuesMaster", async () => {
  const { ref: r } = await import("vue");
  return {
    useVenuesMaster: () => ({
      query: r(""),
      filteredCount: r(1),
      totalCount: r(1),
      items: r([
        { id: "v1", name: "有明会場", selected: true, isMain: false, feeLabel: "¥1000" },
      ]),
      select: state.selectId,
      addVenue: vi.fn(),
      isLoading: r(false),
      loadErrorCode: r(null),
      draft: r({
        id: "v1",
        name: "有明会場",
        address: "",
        fee: 1000,
        feeType: "fixed",
        access: "",
        geo: "",
        main: false,
        updated: "2026-05-01",
      }),
      displayErrors: r({}),
      setField: vi.fn(),
      save: vi.fn(),
      cancel: vi.fn(),
      isSaving: r(false),
      dirty: r(false),
      isDeleting: r(false),
      remove: vi.fn(),
      toast: r(""),
      reload: vi.fn().mockResolvedValue(undefined),
    }),
  };
});

import VenuesMasterDetail from "./VenuesMasterDetail.vue";

async function render() {
  const w = mount(VenuesMasterDetail);
  await flushPromises();
  return w;
}

beforeEach(() => {
  state.selectId.mockClear();
});

describe("VenuesMasterDetail モバイルビュー切替 (#155)", () => {
  it("初期はリストビュー: aside 表示 / form は mobile hidden (md:flex)", async () => {
    const w = await render();
    const aside = w.find("aside");
    const section = w.find("section");
    expect(aside.classes()).not.toContain("hidden");
    expect(section.classes()).toContain("hidden");
    expect(section.classes()).toContain("md:flex");
  });

  it("会場を選択するとフォームビューへ切替 (aside が mobile hidden、form 表示)", async () => {
    const w = await render();
    await w.find("aside button[aria-current='true']").trigger("click");
    expect(state.selectId).toHaveBeenCalledWith("v1");
    expect(w.find("aside").classes()).toContain("hidden");
    expect(w.find("section").classes()).not.toContain("hidden");
  });

  it("フォームビューの「一覧へ戻る」でリストビューへ戻る", async () => {
    const w = await render();
    await w.find("aside button[aria-current='true']").trigger("click");
    const back = w
      .findAll("button")
      .find((b) => b.text().includes("会場一覧へ戻る"));
    expect(back).toBeDefined();
    await back!.trigger("click");
    expect(w.find("aside").classes()).not.toContain("hidden");
    expect(w.find("section").classes()).toContain("hidden");
  });
});
