import { mount, flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryHistory, createRouter } from "vue-router";

// ref を vi.hoisted 内で使うと import 前初期化で落ちるため、mock state は
// プレーンな mutable オブジェクトで保持し、factory 内で computed にラップする。
const { signOutMock, state } = vi.hoisted(() => ({
  signOutMock: vi.fn().mockResolvedValue(undefined),
  state: { email: "owner@high-q.club", pending: 0 },
}));

vi.mock("@/features/auth", async () => {
  const { computed } = await import("vue");
  return {
    useAuthSession: () => ({
      session: computed(() => ({ user: { email: state.email } })),
      signOut: signOutMock,
    }),
  };
});

vi.mock("@/features/identity-document-pending-badge", async () => {
  const { computed } = await import("vue");
  return {
    usePendingCount: () => ({ count: computed(() => state.pending) }),
    PendingCountBadge: {
      props: ["count"],
      template:
        "<span v-if='count > 0' data-test='pending-badge'>{{ count }}</span>",
    },
  };
});

import SidebarNavContent from "./SidebarNavContent.vue";

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: "/", name: "dashboard", component: { template: "<div />" } },
    { path: "/events", name: "events", component: { template: "<div />" } },
    {
      path: "/events/:id",
      name: "events-detail",
      component: { template: "<div />" },
    },
    { path: "/members", name: "members", component: { template: "<div />" } },
    { path: "/venues", name: "venues", component: { template: "<div />" } },
    {
      path: "/identity-documents",
      name: "identity-documents",
      component: { template: "<div />" },
    },
    { path: "/login", name: "login", component: { template: "<div />" } },
  ],
});

async function mountNav() {
  await router.isReady();
  const w = mount(SidebarNavContent, { global: { plugins: [router] } });
  await flushPromises();
  return w;
}

beforeEach(() => {
  signOutMock.mockClear();
  state.email = "owner@high-q.club";
  state.pending = 0;
});

describe("SidebarNavContent", () => {
  it("実在ルートの 5 ナビ項目を表示し、設定は出さない", async () => {
    router.push("/");
    const w = await mountNav();
    const text = w.text();
    for (const label of [
      "ダッシュボード",
      "イベント",
      "会員",
      "会場",
      "本人確認書類",
    ]) {
      expect(text).toContain(label);
    }
    expect(text).not.toContain("設定");
  });

  it("現在ルートに対応する項目を aria-current=page で点灯 (子ルートでも前方一致)", async () => {
    router.push("/events/abc");
    const w = await mountNav();
    const active = w
      .findAll("a")
      .find((a) => a.attributes("aria-current") === "page");
    expect(active?.text()).toContain("イベント");
  });

  it("pending > 0 のとき本人確認書類に Badge を表示", async () => {
    state.pending = 3;
    router.push("/");
    const w = await mountNav();
    expect(w.find("[data-test='pending-badge']").exists()).toBe(true);
  });

  it("pending = 0 のとき Badge は出ない", async () => {
    state.pending = 0;
    router.push("/");
    const w = await mountNav();
    expect(w.find("[data-test='pending-badge']").exists()).toBe(false);
  });

  it("ユーザー email を表示する", async () => {
    router.push("/");
    const w = await mountNav();
    expect(w.text()).toContain("owner@high-q.club");
  });

  it("ログアウト押下で signOut が呼ばれ navigate を emit する", async () => {
    router.push("/");
    const w = await mountNav();
    const logout = w
      .findAll("button")
      .find((b) => b.text().includes("ログアウト"));
    await logout!.trigger("click");
    await flushPromises();
    expect(signOutMock).toHaveBeenCalledTimes(1);
    expect(w.emitted("navigate")).toBeTruthy();
  });

  it("ナビ項目押下で navigate を emit する (ドロワー閉じ用)", async () => {
    router.push("/");
    const w = await mountNav();
    await w.findAll("a")[1]!.trigger("click");
    expect(w.emitted("navigate")).toBeTruthy();
  });
});
