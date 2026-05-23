import { describe, expect, it } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createMemoryHistory, createRouter, type Router } from "vue-router";
import { defineComponent, h } from "vue";
import type { CorrectionRequest } from "@high-q/shared";
import CorrectionRequestBanner from "./CorrectionRequestBanner.vue";

const ADMIN_ID = "00000000-0000-0000-0000-00000000admin";

function makeRequest(
  field: CorrectionRequest["field"],
  message = "msg",
): CorrectionRequest {
  return {
    field,
    message,
    requested_at: "2026-05-23T10:00:00.000Z",
    requested_by: ADMIN_ID,
  };
}

function makeRouter(): Router {
  const Stub = defineComponent({ name: "Stub", render: () => h("div") });
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", component: Stub },
      { path: "/events", component: Stub },
      { path: "/profile", component: Stub },
    ],
  });
}

async function mountBanner(
  requests: ReadonlyArray<CorrectionRequest>,
  router?: Router,
) {
  const r = router ?? makeRouter();
  await r.push("/events");
  await r.isReady();
  return {
    router: r,
    wrapper: mount(CorrectionRequestBanner, {
      props: { requests },
      global: { plugins: [r] },
    }),
  };
}

describe("CorrectionRequestBanner", () => {
  it("0 件は非表示", async () => {
    const { wrapper } = await mountBanner([]);
    expect(wrapper.find("[data-testid='correction-request-banner']").exists()).toBe(
      false,
    );
  });

  it("1 件で field 日本語ラベルと message を表示", async () => {
    const { wrapper } = await mountBanner([makeRequest("birthday", "本人確認書類と一致しません")]);
    const banner = wrapper.find("[data-testid='correction-request-banner']");
    expect(banner.exists()).toBe(true);
    expect(banner.text()).toContain("生年月日");
    expect(banner.text()).toContain("本人確認書類と一致しません");
  });

  it("複数件で全て積み上げ表示", async () => {
    const { wrapper } = await mountBanner([
      makeRequest("last_name"),
      makeRequest("first_name"),
      makeRequest("phone"),
    ]);
    const banner = wrapper.find("[data-testid='correction-request-banner']");
    expect(banner.text()).toContain("お名前 (姓)");
    expect(banner.text()).toContain("お名前 (名)");
    expect(banner.text()).toContain("電話番号");
  });

  it("birthday の「修正する」で /profile?edit=birthday に遷移", async () => {
    const router = makeRouter();
    const { wrapper } = await mountBanner([makeRequest("birthday")], router);
    const row = wrapper.find("[data-field='birthday']");
    await row.find("button").trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.path).toBe("/profile");
    expect(router.currentRoute.value.query.edit).toBe("birthday");
  });

  it("last_name の「修正する」で /profile?edit=displayName に遷移", async () => {
    const router = makeRouter();
    const { wrapper } = await mountBanner([makeRequest("last_name")], router);
    await wrapper.find("[data-field='last_name'] button").trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.query.edit).toBe("displayName");
  });

  it("first_name の「修正する」で /profile?edit=displayName に遷移", async () => {
    const router = makeRouter();
    const { wrapper } = await mountBanner([makeRequest("first_name")], router);
    await wrapper.find("[data-field='first_name'] button").trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.query.edit).toBe("displayName");
  });

  it("phone の「修正する」で /profile?edit=phone に遷移", async () => {
    const router = makeRouter();
    const { wrapper } = await mountBanner([makeRequest("phone")], router);
    await wrapper.find("[data-field='phone'] button").trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.query.edit).toBe("phone");
  });

  it("nickname の「修正する」で /profile?edit=nickname に遷移", async () => {
    const router = makeRouter();
    const { wrapper } = await mountBanner([makeRequest("nickname")], router);
    await wrapper.find("[data-field='nickname'] button").trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.query.edit).toBe("nickname");
  });

  it("experience_level の「修正する」で /profile?edit=experienceLevel に遷移", async () => {
    const router = makeRouter();
    const { wrapper } = await mountBanner(
      [makeRequest("experience_level")],
      router,
    );
    await wrapper.find("[data-field='experience_level'] button").trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.query.edit).toBe("experienceLevel");
  });

  it("dismiss UI を持たない（閉じるボタンが存在しない）", async () => {
    const { wrapper } = await mountBanner([makeRequest("birthday")]);
    expect(wrapper.find("[aria-label='閉じる']").exists()).toBe(false);
    expect(wrapper.find("[data-testid='banner-dismiss']").exists()).toBe(false);
  });
});
