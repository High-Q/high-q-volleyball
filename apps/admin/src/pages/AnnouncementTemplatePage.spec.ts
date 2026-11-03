import { mount, flushPromises, type VueWrapper } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryHistory, createRouter } from "vue-router";

/**
 * spec: openspec/changes/line-announcement-copy/specs/admin-announcement/spec.md
 *   「告知テンプレート画面」— チャネル切り替え（URL クエリ同期・未保存確認）
 */

vi.mock("@/features/auth", async () => {
  const { computed } = await import("vue");
  return {
    useAuthSession: () => ({
      session: computed(() => ({ user: { id: "admin-1" } })),
    }),
  };
});

// フォームは channel prop と dirty 通知だけを持つスタブに差し替える
vi.mock("@/features/announcement-template-edit", async () => {
  const { defineComponent, h } = await import("vue");
  const FormStub = defineComponent({
    props: { channel: { type: String, required: true }, adminMemberId: String },
    emits: ["update:dirty"],
    setup(props, { emit }) {
      return () =>
        h("div", { "data-testid": "form-stub", "data-channel": props.channel }, [
          h("button", {
            "data-testid": "make-dirty",
            onClick: () => emit("update:dirty", true),
          }),
        ]);
    },
  });
  return { AnnouncementTemplateForm: FormStub };
});

import AnnouncementTemplatePage from "./AnnouncementTemplatePage.vue";

let wrapper: VueWrapper | null = null;

function buildRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", name: "dashboard", component: { template: "<div />" } },
      {
        path: "/announcement-template",
        name: "announcement-template",
        component: AnnouncementTemplatePage,
      },
    ],
  });
}

async function mountAt(path: string) {
  const router = buildRouter();
  await router.push(path);
  wrapper = mount(AnnouncementTemplatePage, { global: { plugins: [router] } });
  await flushPromises();
  return { w: wrapper, router };
}

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
});

describe("AnnouncementTemplatePage — チャネル切り替え", () => {
  it("クエリ無しは LINE", async () => {
    const { w } = await mountAt("/announcement-template");
    expect(w.find('[data-testid="form-stub"]').attributes("data-channel")).toBe("line");
    expect(w.find('[data-testid="template-channel-line"]').attributes("aria-selected")).toBe("true");
  });

  it("?channel=x で X を開く。不正値は LINE", async () => {
    const { w } = await mountAt("/announcement-template?channel=x");
    expect(w.find('[data-testid="form-stub"]').attributes("data-channel")).toBe("x");
    w.unmount();
    const { w: w2 } = await mountAt("/announcement-template?channel=jimoty");
    expect(w2.find('[data-testid="form-stub"]').attributes("data-channel")).toBe("line");
  });

  it("タブ押下で URL が ?channel=x になりフォームが切り替わる", async () => {
    const { w, router } = await mountAt("/announcement-template");
    await w.find('[data-testid="template-channel-x"]').trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.query.channel).toBe("x");
    expect(w.find('[data-testid="form-stub"]').attributes("data-channel")).toBe("x");
  });

  it("未保存の変更があるときは確認し、キャンセルなら切り替えない", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    const { w, router } = await mountAt("/announcement-template");
    await w.find('[data-testid="make-dirty"]').trigger("click");
    await w.find('[data-testid="template-channel-x"]').trigger("click");
    await flushPromises();
    expect(confirmSpy).toHaveBeenCalled();
    expect(router.currentRoute.value.query.channel).toBeUndefined();
  });

  it("未保存の変更が無ければ確認しない", async () => {
    const confirmSpy = vi.spyOn(window, "confirm");
    const { w } = await mountAt("/announcement-template");
    await w.find('[data-testid="template-channel-x"]').trigger("click");
    await flushPromises();
    expect(confirmSpy).not.toHaveBeenCalled();
  });
});
