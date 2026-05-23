import { describe, expect, it } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createMemoryHistory, createRouter, type Router } from "vue-router";
import { defineComponent, h } from "vue";
import type { CorrectionRequest } from "@high-q/shared";
import CorrectionRequestPanel from "./CorrectionRequestPanel.vue";

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

async function mountPanel(
  mode: "inline" | "profile",
  requests: ReadonlyArray<CorrectionRequest>,
  router?: Router,
) {
  const r = router ?? makeRouter();
  await r.push("/events");
  await r.isReady();
  return {
    router: r,
    wrapper: mount(CorrectionRequestPanel, {
      props: { mode, requests },
      global: { plugins: [r] },
    }),
  };
}

describe("CorrectionRequestPanel (#296)", () => {
  it("0 件は非表示", async () => {
    const { wrapper } = await mountPanel("inline", []);
    expect(wrapper.find("[data-testid='correction-request-panel']").exists()).toBe(false);
  });

  it("inline mode: kicker に件数を含み、説明文を表示、件数バッジは出さない", async () => {
    const { wrapper } = await mountPanel("inline", [makeRequest("birthday"), makeRequest("phone")]);
    const panel = wrapper.find("[data-testid='correction-request-panel']");
    expect(panel.exists()).toBe(true);
    expect(panel.attributes("data-mode")).toBe("inline");
    expect(panel.text()).toContain("運営からのお願い");
    expect(panel.text()).toContain("· 2 件");
    expect(panel.text()).toContain("ご登録内容について確認のお願いがあります");
    expect(wrapper.find("[data-testid='correction-panel-count-pill']").exists()).toBe(false);
  });

  it("profile mode: kicker は件数を含めない、右上に件数 pill、説明文も出さない", async () => {
    const { wrapper } = await mountPanel("profile", [
      makeRequest("birthday"),
      makeRequest("phone"),
      makeRequest("nickname"),
    ]);
    const panel = wrapper.find("[data-testid='correction-request-panel']");
    expect(panel.attributes("data-mode")).toBe("profile");
    expect(panel.text()).toContain("運営からのお願い");
    expect(panel.text()).not.toContain("· 3 件");
    const pill = wrapper.find("[data-testid='correction-panel-count-pill']");
    expect(pill.exists()).toBe(true);
    expect(pill.text()).toContain("未対応 3");
    expect(panel.text()).not.toContain("ご登録内容について確認のお願いがあります");
  });

  it("各 field の日本語ラベルと message が描画される", async () => {
    const { wrapper } = await mountPanel("inline", [
      makeRequest("birthday", "本人確認書類と一致しません"),
      makeRequest("display_name", "ローマ字 → 漢字に直してください"),
    ]);
    const text = wrapper.text();
    expect(text).toContain("生年月日");
    expect(text).toContain("本人確認書類と一致しません");
    expect(text).toContain("お名前");
    expect(text).toContain("ローマ字 → 漢字に直してください");
  });

  it("birthday の「修正する」で /profile?edit=birthday に遷移", async () => {
    const router = makeRouter();
    const { wrapper } = await mountPanel("inline", [makeRequest("birthday")], router);
    await wrapper.find("[data-field='birthday'] button").trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.path).toBe("/profile");
    expect(router.currentRoute.value.query.edit).toBe("birthday");
  });

  it("display_name の「修正する」で /profile?edit=displayName に遷移", async () => {
    const router = makeRouter();
    const { wrapper } = await mountPanel("profile", [makeRequest("display_name")], router);
    await wrapper.find("[data-field='display_name'] button").trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.query.edit).toBe("displayName");
  });

  it("experience_level の「修正する」で /profile?edit=experienceLevel に遷移", async () => {
    const router = makeRouter();
    const { wrapper } = await mountPanel("inline", [makeRequest("experience_level")], router);
    await wrapper.find("[data-field='experience_level'] button").trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.query.edit).toBe("experienceLevel");
  });

  it("phone / nickname の「修正する」遷移", async () => {
    const router = makeRouter();
    const { wrapper } = await mountPanel(
      "inline",
      [makeRequest("phone"), makeRequest("nickname")],
      router,
    );
    await wrapper.find("[data-field='phone'] button").trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.query.edit).toBe("phone");

    await wrapper.find("[data-field='nickname'] button").trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.query.edit).toBe("nickname");
  });

  it("dismiss UI を持たない（閉じるボタンが存在しない）", async () => {
    const { wrapper } = await mountPanel("inline", [makeRequest("birthday")]);
    expect(wrapper.find("[aria-label='閉じる']").exists()).toBe(false);
    expect(wrapper.findAll("button").every((b) => !b.text().includes("閉じる"))).toBe(true);
  });

  it("⚠ 絵文字を含まない", async () => {
    const { wrapper } = await mountPanel("inline", [makeRequest("birthday")]);
    expect(wrapper.text()).not.toContain("⚠");
  });
});
