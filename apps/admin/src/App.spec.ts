import { describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import App from "./App.vue";
import HomePlaceholder from "./pages/HomePlaceholder.vue";
import LoginPage from "./pages/LoginPage.vue";
import { mountWithRouter } from "./test/mountWithRouter";

vi.mock("@/features/auth", () => ({
  useAuthSession: () => ({
    status: ref<"loading" | "authenticated" | "unauthenticated">(
      "authenticated",
    ),
    aal: ref<"aal1" | "aal2">("aal2"),
    hasMfaFactor: ref<boolean>(true),
    isAdmin: ref<boolean | null>(true),
    ready: () => Promise.resolve(),
    signOut: () => Promise.resolve(),
    refresh: () => Promise.resolve(),
  }),
  useSendMagicLink: () => ({
    status: ref<"idle" | "loading" | "success" | "error">("idle"),
    error: ref<string | null>(null),
    submittedEmail: ref<string>(""),
    send: vi.fn(),
    reset: vi.fn(),
  }),
}));

const routes = [
  {
    path: "/",
    name: "home",
    component: HomePlaceholder,
  },
  {
    path: "/login",
    name: "login",
    component: LoginPage,
    meta: { public: true },
  },
];

describe("App routing smoke", () => {
  it("'/' で HomePlaceholder が描画される", async () => {
    const wrapper = await mountWithRouter(App, routes, "/");
    expect(wrapper.findComponent(HomePlaceholder).exists()).toBe(true);
  });

  it("'/login' で LoginPage が描画される", async () => {
    const wrapper = await mountWithRouter(App, routes, "/login");
    expect(wrapper.findComponent(LoginPage).exists()).toBe(true);
    expect(wrapper.text()).toContain("ログイン");
  });
});
