import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent, h } from "vue";
import {
  createMemoryHistory,
  createRouter,
  type Router,
} from "vue-router";
import { useRouteDetailQuery } from "./useRouteDetailQuery";

interface Harness {
  detail: ReturnType<typeof useRouteDetailQuery>["detail"];
  openDetail: ReturnType<typeof useRouteDetailQuery>["openDetail"];
  closeDetail: ReturnType<typeof useRouteDetailQuery>["closeDetail"];
  router: Router;
}

async function setup(initialPath = "/events/abc"): Promise<Harness> {
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
  await router.push(initialPath);
  await router.isReady();

  let captured!: ReturnType<typeof useRouteDetailQuery>;
  const Harness = defineComponent({
    setup() {
      captured = useRouteDetailQuery();
      return () => h("div");
    },
  });
  mount(Harness, { global: { plugins: [router] } });
  return {
    detail: captured.detail,
    openDetail: captured.openDetail,
    closeDetail: captured.closeDetail,
    router,
  };
}

describe("useRouteDetailQuery", () => {
  it("初期状態で detail クエリがなければ undefined", async () => {
    const h = await setup("/events/abc");
    expect(h.detail.value).toBeUndefined();
  });

  it("?detail=<id> 付きで mount すると detail に値が入る", async () => {
    const h = await setup(
      "/events/abc?detail=00000000-0000-0000-0000-000000000001",
    );
    expect(h.detail.value).toBe("00000000-0000-0000-0000-000000000001");
  });

  it("openDetail で URL に detail クエリが追加される", async () => {
    const h = await setup("/events/abc");
    await h.openDetail("11111111-1111-1111-1111-111111111111");
    expect(h.router.currentRoute.value.query.detail).toBe(
      "11111111-1111-1111-1111-111111111111",
    );
    expect(h.detail.value).toBe("11111111-1111-1111-1111-111111111111");
  });

  it("closeDetail で URL から detail クエリが削除される", async () => {
    const h = await setup("/events/abc?detail=xyz");
    await h.closeDetail();
    expect(h.router.currentRoute.value.query.detail).toBeUndefined();
    expect(h.detail.value).toBeUndefined();
  });

  it("openDetail / closeDetail で他のクエリ (例: q) は保持される", async () => {
    const h = await setup("/events/abc?q=search-term");
    await h.openDetail("xyz");
    expect(h.router.currentRoute.value.query.q).toBe("search-term");
    expect(h.router.currentRoute.value.query.detail).toBe("xyz");
    await h.closeDetail();
    expect(h.router.currentRoute.value.query.q).toBe("search-term");
    expect(h.router.currentRoute.value.query.detail).toBeUndefined();
  });
});
