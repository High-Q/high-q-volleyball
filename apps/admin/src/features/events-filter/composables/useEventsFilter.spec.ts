import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent, h, type Ref } from "vue";
import {
  createMemoryHistory,
  createRouter,
  type RouteLocationNormalizedLoaded,
  type Router,
} from "vue-router";
import { useEventsFilter } from "./useEventsFilter";
import type { FilterState } from "../types";

interface Harness {
  filter: Ref<FilterState>;
  isFiltered: Ref<boolean>;
  setPeriod: ReturnType<typeof useEventsFilter>["setPeriod"];
  setVenue: ReturnType<typeof useEventsFilter>["setVenue"];
  setVisibility: ReturnType<typeof useEventsFilter>["setVisibility"];
  setSearch: ReturnType<typeof useEventsFilter>["setSearch"];
  setSort: ReturnType<typeof useEventsFilter>["setSort"];
  setPage: ReturnType<typeof useEventsFilter>["setPage"];
  reset: ReturnType<typeof useEventsFilter>["reset"];
  router: Router;
  route: RouteLocationNormalizedLoaded;
}

async function setup(initialQuery = ""): Promise<Harness> {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/events", name: "events", component: { template: "<div />" } }],
  });
  await router.push(`/events${initialQuery ? `?${initialQuery}` : ""}`);
  await router.isReady();

  let captured!: ReturnType<typeof useEventsFilter>;
  let assigned = false;
  const Harness = defineComponent({
    setup() {
      captured = useEventsFilter();
      assigned = true;
      return () => h("div");
    },
  });
  mount(Harness, {
    global: { plugins: [router] },
  });
  if (!assigned) throw new Error("composable not captured");
  const c = captured;
  return {
    filter: c.filter,
    isFiltered: c.isFiltered,
    setPeriod: c.setPeriod,
    setVenue: c.setVenue,
    setVisibility: c.setVisibility,
    setSearch: c.setSearch,
    setSort: c.setSort,
    setPage: c.setPage,
    reset: c.reset,
    router,
    route: router.currentRoute.value,
  };
}

describe("useEventsFilter — 初期化", () => {
  it("URL クエリ未指定でデフォルト値（period='upcoming', sort='date', dir='asc', page=1, search=''）", async () => {
    const h = await setup();
    expect(h.filter.value.period).toBe("upcoming");
    expect(h.filter.value.sort).toBe("date");
    expect(h.filter.value.dir).toBe("asc");
    expect(h.filter.value.page).toBe(1);
    expect(h.filter.value.search).toBe("");
    expect(h.filter.value.venueId).toBeUndefined();
    expect(h.filter.value.visibility).toBeUndefined();
  });

  it("URL クエリから全フィルタが復元される", async () => {
    const h = await setup(
      "period=this-month&venue=22222222-2222-4222-8222-222222222222&visibility=published&q=ゆる練&sort=status&dir=desc&page=2",
    );
    expect(h.filter.value.period).toBe("this-month");
    expect(h.filter.value.venueId).toBe("22222222-2222-4222-8222-222222222222");
    expect(h.filter.value.visibility).toBe("published");
    expect(h.filter.value.search).toBe("ゆる練");
    expect(h.filter.value.sort).toBe("status");
    expect(h.filter.value.dir).toBe("desc");
    expect(h.filter.value.page).toBe(2);
  });

  it("不正な period / dir / sort はデフォルトに silent fallback", async () => {
    const h = await setup("period=invalid&dir=banana&sort=foo");
    expect(h.filter.value.period).toBe("upcoming");
    expect(h.filter.value.dir).toBe("asc");
    expect(h.filter.value.sort).toBe("date");
  });
});

describe("useEventsFilter — setter で URL クエリが同期される", () => {
  it("setPeriod('last-month') で ?period=last-month に同期", async () => {
    const h = await setup();
    await h.setPeriod("last-month");
    expect(h.router.currentRoute.value.query.period).toBe("last-month");
  });

  it("setSearch('foo') で ?q=foo に同期、空文字なら q が消える", async () => {
    const h = await setup("q=initial");
    await h.setSearch("foo");
    expect(h.router.currentRoute.value.query.q).toBe("foo");
    await h.setSearch("");
    expect(h.router.currentRoute.value.query.q).toBeUndefined();
  });

  it("setSort('status', 'desc') で ?sort=status&dir=desc に同期", async () => {
    const h = await setup();
    await h.setSort("status", "desc");
    expect(h.router.currentRoute.value.query.sort).toBe("status");
    expect(h.router.currentRoute.value.query.dir).toBe("desc");
  });

  it("setPage(3) で ?page=3 に同期（push 扱い）", async () => {
    const h = await setup();
    await h.setPage(3);
    expect(h.router.currentRoute.value.query.page).toBe("3");
  });

  it("reset() で全フィルタがデフォルトに戻る", async () => {
    const h = await setup(
      "period=this-month&q=foo&sort=status&dir=desc&page=2",
    );
    await h.reset();
    expect(h.router.currentRoute.value.query.period).toBeUndefined();
    expect(h.router.currentRoute.value.query.q).toBeUndefined();
    expect(h.router.currentRoute.value.query.sort).toBeUndefined();
    expect(h.router.currentRoute.value.query.dir).toBeUndefined();
    expect(h.router.currentRoute.value.query.page).toBeUndefined();
  });
});

describe("useEventsFilter — isFiltered", () => {
  it("デフォルト状態 (period='upcoming') は isFiltered === false 扱い（period のみは初期値とみなす）", async () => {
    const h = await setup();
    expect(h.isFiltered.value).toBe(false);
  });

  it("search 入力ありで isFiltered === true", async () => {
    const h = await setup("q=練習");
    expect(h.isFiltered.value).toBe(true);
  });

  it("venue 指定ありで isFiltered === true", async () => {
    const h = await setup("venue=22222222-2222-4222-8222-222222222222");
    expect(h.isFiltered.value).toBe(true);
  });

  it("period が default 以外で isFiltered === true", async () => {
    const h = await setup("period=this-month");
    expect(h.isFiltered.value).toBe(true);
  });
});
