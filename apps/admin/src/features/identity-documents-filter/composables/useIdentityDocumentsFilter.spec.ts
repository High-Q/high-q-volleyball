import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent, h, type Ref } from "vue";
import {
  createMemoryHistory,
  createRouter,
  type Router,
} from "vue-router";
import { useIdentityDocumentsFilter } from "./useIdentityDocumentsFilter";
import type { FilterState } from "../types";

interface Harness {
  filter: Ref<FilterState>;
  isDefault: Ref<boolean>;
  setStatus: ReturnType<typeof useIdentityDocumentsFilter>["setStatus"];
  setSearch: ReturnType<typeof useIdentityDocumentsFilter>["setSearch"];
  setPage: ReturnType<typeof useIdentityDocumentsFilter>["setPage"];
  reset: ReturnType<typeof useIdentityDocumentsFilter>["reset"];
  ensureDefaultUrl: ReturnType<
    typeof useIdentityDocumentsFilter
  >["ensureDefaultUrl"];
  router: Router;
}

async function setup(initialQuery = ""): Promise<Harness> {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: "/identity-documents",
        name: "identity-documents",
        component: { template: "<div />" },
      },
    ],
  });
  await router.push(
    `/identity-documents${initialQuery ? `?${initialQuery}` : ""}`,
  );
  await router.isReady();

  let captured!: ReturnType<typeof useIdentityDocumentsFilter>;
  const Harness = defineComponent({
    setup() {
      captured = useIdentityDocumentsFilter();
      return () => h("div");
    },
  });
  mount(Harness, {
    global: { plugins: [router] },
  });
  return {
    filter: captured.filter,
    isDefault: captured.isDefault,
    setStatus: captured.setStatus,
    setSearch: captured.setSearch,
    setPage: captured.setPage,
    reset: captured.reset,
    ensureDefaultUrl: captured.ensureDefaultUrl,
    router,
  };
}

describe("useIdentityDocumentsFilter — URL → state パース", () => {
  it("URL クエリが空のときデフォルト (status=pending / search=空 / page=1) になる", async () => {
    const h = await setup();
    expect(h.filter.value).toEqual({
      status: "pending",
      search: "",
      page: 1,
    });
  });

  it("status=approved の URL を解釈する", async () => {
    const h = await setup("status=approved");
    expect(h.filter.value.status).toBe("approved");
  });

  it("status=rejected の URL を解釈する", async () => {
    const h = await setup("status=rejected");
    expect(h.filter.value.status).toBe("rejected");
  });

  it("status=all の URL を解釈する", async () => {
    const h = await setup("status=all");
    expect(h.filter.value.status).toBe("all");
  });

  it("status=invalid の URL は pending にフォールバックする", async () => {
    const h = await setup("status=invalid");
    expect(h.filter.value.status).toBe("pending");
  });

  it("q パラメータを search に同期する (URL エンコード経由)", async () => {
    const h = await setup("q=tanaka");
    expect(h.filter.value.search).toBe("tanaka");
  });

  it("page パラメータを数値として解釈する", async () => {
    const h = await setup("page=3");
    expect(h.filter.value.page).toBe(3);
  });

  it("page=0 や負数は 1 にフォールバック", async () => {
    const h = await setup("page=-1");
    expect(h.filter.value.page).toBe(1);
  });

  it("page=NaN (非数) は 1 にフォールバック", async () => {
    const h = await setup("page=abc");
    expect(h.filter.value.page).toBe(1);
  });
});

describe("useIdentityDocumentsFilter — state → URL 直列化", () => {
  it("setStatus(approved) で URL に status=approved + page=1 が反映される", async () => {
    const h = await setup();
    await h.setStatus("approved");
    expect(h.router.currentRoute.value.query.status).toBe("approved");
    // page は 1 にリセットされ URL からは省略 (DEFAULT)
    expect(h.router.currentRoute.value.query.page).toBeUndefined();
  });

  it("setStatus は status を常に URL に明示書き込みする (pending でも書く)", async () => {
    const h = await setup("status=approved");
    await h.setStatus("pending");
    expect(h.router.currentRoute.value.query.status).toBe("pending");
  });

  it("setSearch('田中') で URL に q=田中 + page=1 が反映される", async () => {
    const h = await setup();
    await h.setSearch("田中");
    expect(h.router.currentRoute.value.query.q).toBe("田中");
  });

  it("setSearch('') で URL から q が削除される", async () => {
    const h = await setup("status=pending&q=foo");
    await h.setSearch("");
    expect(h.router.currentRoute.value.query.q).toBeUndefined();
  });

  it("setPage(2) で URL に page=2 が反映される (push)", async () => {
    const h = await setup();
    await h.setPage(2);
    expect(h.router.currentRoute.value.query.page).toBe("2");
  });

  it("setStatus は page を 1 にリセットする (page=3 から status 変更 → page=1)", async () => {
    const h = await setup("status=pending&page=3");
    await h.setStatus("approved");
    expect(h.router.currentRoute.value.query.page).toBeUndefined();
    expect(h.filter.value.page).toBe(1);
  });

  it("reset() で URL がデフォルト (status=pending のみ) になる", async () => {
    const h = await setup("status=approved&q=foo&page=3");
    await h.reset();
    expect(h.router.currentRoute.value.query.status).toBe("pending");
    expect(h.router.currentRoute.value.query.q).toBeUndefined();
    expect(h.router.currentRoute.value.query.page).toBeUndefined();
  });
});

describe("useIdentityDocumentsFilter — isDefault 派生プロパティ", () => {
  it("URL クエリが空のとき isDefault = true", async () => {
    const h = await setup();
    expect(h.isDefault.value).toBe(true);
  });

  it("status=approved のとき isDefault = false", async () => {
    const h = await setup("status=approved");
    expect(h.isDefault.value).toBe(false);
  });

  it("q=foo のとき isDefault = false", async () => {
    const h = await setup("status=pending&q=foo");
    expect(h.isDefault.value).toBe(false);
  });

  it("page=2 のとき isDefault = false", async () => {
    const h = await setup("status=pending&page=2");
    expect(h.isDefault.value).toBe(false);
  });
});

describe("useIdentityDocumentsFilter — ensureDefaultUrl (URL 自動補完)", () => {
  it("URL に status が無いとき pending を URL に補完する", async () => {
    const h = await setup();
    expect(h.router.currentRoute.value.query.status).toBeUndefined();
    await h.ensureDefaultUrl();
    expect(h.router.currentRoute.value.query.status).toBe("pending");
  });

  it("URL に status=approved があるときは何もしない (上書きしない)", async () => {
    const h = await setup("status=approved");
    await h.ensureDefaultUrl();
    expect(h.router.currentRoute.value.query.status).toBe("approved");
  });

  it("URL に status=rejected があるときも上書きしない", async () => {
    const h = await setup("status=rejected");
    await h.ensureDefaultUrl();
    expect(h.router.currentRoute.value.query.status).toBe("rejected");
  });
});
