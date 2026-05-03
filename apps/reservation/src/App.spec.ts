import { describe, expect, it, vi } from "vitest";
import App from "./App.vue";
import HomePlaceholder from "./pages/HomePlaceholder.vue";
import LoginPage from "./pages/LoginPage.vue";
import { mountWithRouter } from "./test/mountWithRouter";

// / ルートは認証必須になったため、HomePlaceholder の smoke test は authenticated
// 状態のモックで検証する。/login は未認証で OK。
vi.mock("@/features/auth", () => ({
  useAuthSession: () => ({
    status: { value: "authenticated" as const },
    isProfileComplete: { value: true },
    signOut: vi.fn(),
  }),
  useSendMagicLink: () => ({
    status: { value: "idle" as const },
    error: { value: null },
    submittedEmail: { value: "" },
    send: vi.fn(),
    reset: vi.fn(),
  }),
  useCompleteProfile: () => ({
    status: { value: "idle" as const },
    error: { value: null },
    fieldErrors: { value: {} },
    submit: vi.fn(),
    reset: vi.fn(),
  }),
}));

const routes = [
  { path: "/", name: "home", component: HomePlaceholder },
  { path: "/login", name: "login", component: LoginPage },
];

describe("App routing smoke", () => {
  it("'/' で HomePlaceholder が描画される (認証済み + プロフィール完成済モック)", async () => {
    const wrapper = await mountWithRouter(App, routes, "/");
    expect(wrapper.findComponent(HomePlaceholder).exists()).toBe(true);
    // / は会員ダッシュボードのプレースホルダ「準備中」を表示
    expect(wrapper.text()).toContain("予約サイト — 準備中");
  });

  it("'/login' で LoginPage が描画される", async () => {
    const wrapper = await mountWithRouter(App, routes, "/login");
    expect(wrapper.findComponent(LoginPage).exists()).toBe(true);
    expect(wrapper.text()).toContain("ログイン");
  });
});
