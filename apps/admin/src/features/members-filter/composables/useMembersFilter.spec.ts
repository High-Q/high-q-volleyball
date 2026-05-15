import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent, h, type Ref } from "vue";
import {
  createMemoryHistory,
  createRouter,
  type Router,
} from "vue-router";
import { useMembersFilter } from "./useMembersFilter";
import type { MembersFilterState } from "../types";

interface Harness {
  filter: Ref<MembersFilterState>;
  isFiltered: Ref<boolean>;
  setExp: ReturnType<typeof useMembersFilter>["setExp"];
  setAttendedRange: ReturnType<typeof useMembersFilter>["setAttendedRange"];
  setLastPeriod: ReturnType<typeof useMembersFilter>["setLastPeriod"];
  setSearch: ReturnType<typeof useMembersFilter>["setSearch"];
  setSort: ReturnType<typeof useMembersFilter>["setSort"];
  setPage: ReturnType<typeof useMembersFilter>["setPage"];
  openDetail: ReturnType<typeof useMembersFilter>["openDetail"];
  closeDetail: ReturnType<typeof useMembersFilter>["closeDetail"];
  reset: ReturnType<typeof useMembersFilter>["reset"];
  router: Router;
}

async function setup(initialQuery = ""): Promise<Harness> {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/members", name: "members", component: { template: "<div />" } },
    ],
  });
  await router.push(`/members${initialQuery ? `?${initialQuery}` : ""}`);
  await router.isReady();

  let captured!: ReturnType<typeof useMembersFilter>;
  const Harness = defineComponent({
    setup() {
      captured = useMembersFilter();
      return () => h("div");
    },
  });
  mount(Harness, { global: { plugins: [router] } });
  return {
    filter: captured.filter,
    isFiltered: captured.isFiltered,
    setExp: captured.setExp,
    setAttendedRange: captured.setAttendedRange,
    setLastPeriod: captured.setLastPeriod,
    setSearch: captured.setSearch,
    setSort: captured.setSort,
    setPage: captured.setPage,
    openDetail: captured.openDetail,
    closeDetail: captured.closeDetail,
    reset: captured.reset,
    router,
  };
}

describe("useMembersFilter — 初期化", () => {
  it("URL クエリ未指定でデフォルト値 (sort=last_attended_at, dir=desc, page=1)", async () => {
    const h = await setup();
    expect(h.filter.value.sort).toBe("last_attended_at");
    expect(h.filter.value.dir).toBe("desc");
    expect(h.filter.value.page).toBe(1);
    expect(h.filter.value.search).toBe("");
    expect(h.filter.value.exp).toBeUndefined();
    expect(h.filter.value.attendedRange).toBeUndefined();
    expect(h.filter.value.lastPeriod).toBeUndefined();
    expect(h.filter.value.detail).toBeUndefined();
  });

  it("URL クエリから全フィルタが復元される", async () => {
    const h = await setup(
      "exp=experienced&attended=11%2B&last=this-month&q=メール届かず&sort=attended_count&dir=asc&page=3&detail=00000000-0000-0000-0000-000000000001",
    );
    expect(h.filter.value.exp).toBe("experienced");
    expect(h.filter.value.attendedRange).toBe("11+");
    expect(h.filter.value.lastPeriod).toBe("this-month");
    expect(h.filter.value.search).toBe("メール届かず");
    expect(h.filter.value.sort).toBe("attended_count");
    expect(h.filter.value.dir).toBe("asc");
    expect(h.filter.value.page).toBe(3);
    expect(h.filter.value.detail).toBe("00000000-0000-0000-0000-000000000001");
  });

  it("不正値はデフォルト/未定義に補正される", async () => {
    const h = await setup("exp=bogus&attended=invalid&sort=junk&dir=??");
    expect(h.filter.value.exp).toBeUndefined();
    expect(h.filter.value.attendedRange).toBeUndefined();
    expect(h.filter.value.sort).toBe("last_attended_at");
    expect(h.filter.value.dir).toBe("desc");
  });
});

describe("useMembersFilter — 状態更新", () => {
  it("setExp で URL クエリが更新され、page が 1 にリセットされる", async () => {
    const h = await setup("page=5");
    await h.setExp("intermediate");
    expect(h.router.currentRoute.value.query.exp).toBe("intermediate");
    expect(h.router.currentRoute.value.query.page).toBeUndefined();
    expect(h.filter.value.page).toBe(1);
  });

  it("setSort で sort と dir が更新される", async () => {
    const h = await setup();
    await h.setSort("attended_count", "asc");
    expect(h.router.currentRoute.value.query.sort).toBe("attended_count");
    expect(h.router.currentRoute.value.query.dir).toBe("asc");
  });

  it("openDetail / closeDetail で detail クエリが切り替わる", async () => {
    const h = await setup();
    await h.openDetail("00000000-0000-0000-0000-000000000001");
    expect(h.filter.value.detail).toBe("00000000-0000-0000-0000-000000000001");
    await h.closeDetail();
    expect(h.filter.value.detail).toBeUndefined();
  });

  it("reset で全クエリがデフォルトに戻る", async () => {
    const h = await setup("exp=experienced&q=test&page=2");
    await h.reset();
    expect(h.filter.value.exp).toBeUndefined();
    expect(h.filter.value.search).toBe("");
    expect(h.filter.value.page).toBe(1);
    expect(h.isFiltered.value).toBe(false);
  });
});

describe("useMembersFilter — isFiltered", () => {
  it("デフォルト状態では false", async () => {
    const h = await setup();
    expect(h.isFiltered.value).toBe(false);
  });

  it("検索ワードがあれば true", async () => {
    const h = await setup("q=test");
    expect(h.isFiltered.value).toBe(true);
  });
});
