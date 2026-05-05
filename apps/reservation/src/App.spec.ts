import { describe, expect, it, vi } from "vitest";
import App from "./App.vue";
import EventsListPage from "./pages/EventsListPage.vue";
import LoginPage from "./pages/LoginPage.vue";
import { mountWithRouter } from "./test/mountWithRouter";

// / ルートは認証必須 + /events への redirect になったため、認証済モックで
// EventsListPage が描画されることを検証する (#90)。/login は未認証で OK。
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

// `useUpcomingEvents` は entity の Supabase クエリを呼ぶため、smoke test では
// 一覧空の状態で描画できる軽量モックに差し替える。
vi.mock("@/features/event-listing", async () => {
  const actual = await vi.importActual<
    typeof import("@/features/event-listing")
  >("@/features/event-listing");
  return {
    ...actual,
    useUpcomingEvents: () => ({
      events: { value: [] },
      loading: { value: false },
      error: { value: null },
      reload: vi.fn(),
    }),
  };
});

const routes = [
  { path: "/", name: "home", redirect: { name: "events-list" } },
  { path: "/events", name: "events-list", component: EventsListPage },
  { path: "/login", name: "login", component: LoginPage },
];

describe("App routing smoke", () => {
  it("'/' で /events に redirect され EventsListPage が描画される (#90)", async () => {
    const wrapper = await mountWithRouter(App, routes, "/");
    expect(wrapper.findComponent(EventsListPage).exists()).toBe(true);
    expect(wrapper.text()).toContain("次の練習を、");
  });

  it("'/login' で LoginPage が描画される", async () => {
    const wrapper = await mountWithRouter(App, routes, "/login");
    expect(wrapper.findComponent(LoginPage).exists()).toBe(true);
    expect(wrapper.text()).toContain("ログイン");
  });
});
