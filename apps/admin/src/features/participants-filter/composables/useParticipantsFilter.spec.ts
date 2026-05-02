import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent, h, type Ref } from "vue";
import {
  createMemoryHistory,
  createRouter,
  type Router,
} from "vue-router";
import { useParticipantsFilter } from "./useParticipantsFilter";
import type { ParticipantsFilter } from "../types";

interface Harness {
  filter: Ref<ParticipantsFilter>;
  isFiltered: Ref<boolean>;
  setSearch: ReturnType<typeof useParticipantsFilter>["setSearch"];
  setExperience: ReturnType<typeof useParticipantsFilter>["setExperience"];
  setCheckinState: ReturnType<typeof useParticipantsFilter>["setCheckinState"];
  reset: ReturnType<typeof useParticipantsFilter>["reset"];
  router: Router;
}

async function setup(initialQuery = ""): Promise<Harness> {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: "/events/:id",
        name: "events-detail",
        component: { template: "<div />" },
      },
    ],
  });
  await router.push(
    `/events/test-id${initialQuery ? `?${initialQuery}` : ""}`,
  );
  await router.isReady();

  let captured!: ReturnType<typeof useParticipantsFilter>;
  const Harness = defineComponent({
    setup() {
      captured = useParticipantsFilter();
      return () => h("div");
    },
  });
  mount(Harness, { global: { plugins: [router] } });
  return {
    filter: captured.filter,
    isFiltered: captured.isFiltered,
    setSearch: captured.setSearch,
    setExperience: captured.setExperience,
    setCheckinState: captured.setCheckinState,
    reset: captured.reset,
    router,
  };
}

describe("useParticipantsFilter — 初期化 (URL → state)", () => {
  it("URL クエリ未指定でデフォルト値（q='', experience/checkinState undefined）", async () => {
    const h = await setup();
    expect(h.filter.value.q).toBe("");
    expect(h.filter.value.experience).toBeUndefined();
    expect(h.filter.value.checkinState).toBeUndefined();
    expect(h.isFiltered.value).toBe(false);
  });

  it("?q= で検索文字列が復元される", async () => {
    const h = await setup("q=tanaka");
    expect(h.filter.value.q).toBe("tanaka");
    expect(h.isFiltered.value).toBe(true);
  });

  it("?exp=experienced で経験フィルタが復元される", async () => {
    const h = await setup("exp=experienced");
    expect(h.filter.value.experience).toBe("experienced");
    expect(h.isFiltered.value).toBe(true);
  });

  it("?ck=unchecked でチェックイン状態フィルタが復元される", async () => {
    const h = await setup("ck=unchecked");
    expect(h.filter.value.checkinState).toBe("unchecked");
  });

  it("複合クエリで全項目が復元される", async () => {
    const h = await setup("q=sato&exp=intermediate&ck=checked");
    expect(h.filter.value.q).toBe("sato");
    expect(h.filter.value.experience).toBe("intermediate");
    expect(h.filter.value.checkinState).toBe("checked");
  });

  it("不正な exp 値は undefined にフォールバック", async () => {
    const h = await setup("exp=invalid-value");
    expect(h.filter.value.experience).toBeUndefined();
  });

  it("不正な ck 値は undefined にフォールバック", async () => {
    const h = await setup("ck=foo");
    expect(h.filter.value.checkinState).toBeUndefined();
  });
});

describe("useParticipantsFilter — 更新 (state → URL)", () => {
  it("setSearch で URL に ?q= が反映される", async () => {
    const h = await setup();
    await h.setSearch("田中");
    expect(h.router.currentRoute.value.query.q).toBe("田中");
  });

  it("setSearch('') で URL から q が削除される", async () => {
    const h = await setup("q=tanaka");
    await h.setSearch("");
    expect(h.router.currentRoute.value.query.q).toBeUndefined();
  });

  it("setExperience で ?exp= が反映される", async () => {
    const h = await setup();
    await h.setExperience("beginner");
    expect(h.router.currentRoute.value.query.exp).toBe("beginner");
  });

  it("setExperience(undefined) で「すべて」→ URL から exp が削除される", async () => {
    const h = await setup("exp=experienced");
    await h.setExperience(undefined);
    expect(h.router.currentRoute.value.query.exp).toBeUndefined();
  });

  it("setCheckinState で ?ck= が反映される", async () => {
    const h = await setup();
    await h.setCheckinState("checked");
    expect(h.router.currentRoute.value.query.ck).toBe("checked");
  });

  it("setCheckinState(undefined) で URL から ck が削除される", async () => {
    const h = await setup("ck=unchecked");
    await h.setCheckinState(undefined);
    expect(h.router.currentRoute.value.query.ck).toBeUndefined();
  });

  it("既存クエリと merge ではなく overwrite（本画面は q/exp/ck のみ使用）", async () => {
    const h = await setup("q=tanaka&exp=beginner&ck=unchecked");
    await h.setSearch("sato");
    expect(h.router.currentRoute.value.query.q).toBe("sato");
    expect(h.router.currentRoute.value.query.exp).toBe("beginner");
    expect(h.router.currentRoute.value.query.ck).toBe("unchecked");
  });
});

describe("useParticipantsFilter — reset", () => {
  it("reset で全クエリが削除される", async () => {
    const h = await setup("q=tanaka&exp=experienced&ck=checked");
    await h.reset();
    const q = h.router.currentRoute.value.query;
    expect(q.q).toBeUndefined();
    expect(q.exp).toBeUndefined();
    expect(q.ck).toBeUndefined();
    expect(h.isFiltered.value).toBe(false);
  });
});

describe("useParticipantsFilter — リロード相当のラウンドトリップ", () => {
  it("setSearch → 新たに setup したときに同じ state が復元される", async () => {
    const h1 = await setup();
    await h1.setSearch("tanaka");
    const restoredQuery = h1.router.currentRoute.value.query.q as string;

    const h2 = await setup(`q=${restoredQuery}`);
    expect(h2.filter.value.q).toBe("tanaka");
  });
});
