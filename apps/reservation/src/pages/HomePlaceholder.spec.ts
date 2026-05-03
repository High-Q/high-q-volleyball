import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { defineComponent } from "vue";

const signOutMock = vi.fn();
const sessionState = {
  status: { value: "authenticated" as "loading" | "authenticated" | "unauthenticated" },
  isProfileComplete: { value: true as boolean },
  signOut: signOutMock,
};

vi.mock("@/features/auth", () => ({
  useAuthSession: () => sessionState,
}));

const Stub = defineComponent({ template: "<div/>" });
const routes = [
  { path: "/", name: "home", component: Stub },
  { path: "/login", name: "login", component: Stub },
];

beforeEach(() => {
  vi.clearAllMocks();
  signOutMock.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

async function mountPage() {
  const HomePlaceholder = (await import("./HomePlaceholder.vue")).default;
  const router = createRouter({ history: createMemoryHistory(), routes });
  await router.push("/");
  await router.isReady();
  const wrapper = mount(HomePlaceholder, { global: { plugins: [router] } });
  await flushPromises();
  return { wrapper, router };
}

describe("HomePlaceholder (認証必須・準備中ダッシュボード)", () => {
  it("「準備中」 + ログアウトボタンを表示", async () => {
    const { wrapper } = await mountPage();
    expect(wrapper.text()).toContain("予約サイト — 準備中");
    expect(wrapper.text()).toContain("ログアウト");
    // ランディング (未認証用) 文言は無いこと
    expect(wrapper.text()).not.toContain("社会人バレーボールサークル");
    expect(wrapper.text()).not.toContain("ログイン / 会員登録へ進む");
  });

  it("ログアウトボタン押下で signOut + /login に遷移", async () => {
    const { wrapper, router } = await mountPage();
    const logoutBtn = wrapper.findAll("button").find((b) => b.text().includes("ログアウト"));
    await logoutBtn?.trigger("click");
    await flushPromises();
    expect(signOutMock).toHaveBeenCalled();
    expect(router.currentRoute.value.name).toBe("login");
  });
});
