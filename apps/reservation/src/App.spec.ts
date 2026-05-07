import { describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import App from "./App.vue";
import EventsListPage from "./pages/EventsListPage.vue";
import LoginPage from "./pages/LoginPage.vue";
import { mountWithRouter } from "./test/mountWithRouter";

// / ルートは認証必須 + /events への redirect になったため、認証済モックで
// EventsListPage が描画されることを検証する (#90)。/login は未認証で OK。
vi.mock("@/features/auth", () => ({
  useAuthSession: () => ({
    status: ref("authenticated"),
    isProfileComplete: ref(true),
    hasIdentityDocument: ref(true),
    member: ref({ displayName: "山田 太郎", nickname: null }),
    session: ref({ user: { id: "00000000-0000-0000-0000-000000000001" } }),
    signOut: vi.fn(),
  }),
  useSendMagicLink: () => ({
    status: ref("idle"),
    error: ref(null),
    submittedEmail: ref(""),
    send: vi.fn(),
    reset: vi.fn(),
  }),
  useCompleteProfile: () => ({
    status: ref("idle"),
    error: ref(null),
    fieldErrors: ref({}),
    submit: vi.fn(),
    reset: vi.fn(),
  }),
}));

// `useUpcomingEvents` / `useNextReservation` は entity の Supabase クエリを呼ぶため、
// smoke test では「予約 0 件 + イベント 0 件」の状態で描画できる軽量モックに差し替える。
vi.mock("@/features/event-listing", async () => {
  const actual = await vi.importActual<
    typeof import("@/features/event-listing")
  >("@/features/event-listing");
  return {
    ...actual,
    useUpcomingEvents: () => ({
      events: ref([]),
      loading: ref(false),
      error: ref(null),
      reload: vi.fn(),
    }),
    useNextReservation: () => ({
      reservation: ref(null),
      loading: ref(false),
      error: ref(null),
      reload: vi.fn(),
    }),
  };
});

const routes = [
  { path: "/", name: "home", redirect: { name: "events-list" } },
  { path: "/events", name: "events-list", component: EventsListPage },
  { path: "/login", name: "login", component: LoginPage },
  // BottomTabBar が name="profile" / name="history" を resolve できるよう、
  // smoke test 用に軽量プレースホルダでルートを定義しておく (#91 / #211)
  {
    path: "/profile",
    name: "profile",
    component: { template: "<div/>" },
  },
  {
    path: "/history",
    name: "history",
    component: { template: "<div/>" },
  },
];

describe("App routing smoke", () => {
  it("'/' で /events に redirect され EventsListPage が描画される (#90 / #212)", async () => {
    const wrapper = await mountWithRouter(App, routes, "/");
    expect(wrapper.findComponent(EventsListPage).exists()).toBe(true);
    // ホーム V2 (#212): ヘッダロゴ + 挨拶 kicker が描画される
    expect(wrapper.text()).toContain("High Q");
    expect(wrapper.text()).toContain("こんにちは");
  });

  it("'/login' で LoginPage が描画される", async () => {
    const wrapper = await mountWithRouter(App, routes, "/login");
    expect(wrapper.findComponent(LoginPage).exists()).toBe(true);
    expect(wrapper.text()).toContain("ログイン");
  });
});
