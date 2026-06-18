import { describe, expect, it, vi } from "vitest";
import { defineComponent, ref } from "vue";
import App from "./App.vue";
import LoginPage from "./pages/LoginPage.vue";
import { mountWithRouter } from "./test/mountWithRouter";

// '/' 着地のスモーク用 stub (実際の DashboardPage は重い widget チェーンを持つため、
// ルーティング疎通の確認にはトリビアルな stub で十分)。
const HomeStub = defineComponent({
  name: "HomeStub",
  template: "<div data-test='home-stub' />",
});

// admin-shell は auth / pending / 全ルート RouterLink を引き込むため、routing
// スモークでは passthrough stub にしてシェルの有無のみ検証する。
vi.mock("@/widgets/admin-shell", () => ({
  AdminShell: {
    name: "AdminShell",
    template: "<div data-test='admin-shell'><slot /></div>",
  },
}));

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
    component: HomeStub,
  },
  {
    path: "/login",
    name: "login",
    component: LoginPage,
    meta: { public: true },
  },
];

describe("App routing smoke", () => {
  it("'/' でホームコンポーネントが描画される", async () => {
    const wrapper = await mountWithRouter(App, routes, "/");
    expect(wrapper.find("[data-test='home-stub']").exists()).toBe(true);
  });

  it("'/login' で LoginPage が描画される", async () => {
    const wrapper = await mountWithRouter(App, routes, "/login");
    expect(wrapper.findComponent(LoginPage).exists()).toBe(true);
    expect(wrapper.text()).toContain("ログイン");
  });

  it("認証配下ルートはシェルで包む", async () => {
    const wrapper = await mountWithRouter(App, routes, "/");
    expect(wrapper.find("[data-test='admin-shell']").exists()).toBe(true);
  });

  it("公開ルート (login) はシェル無し", async () => {
    const wrapper = await mountWithRouter(App, routes, "/login");
    expect(wrapper.find("[data-test='admin-shell']").exists()).toBe(false);
  });
});
