import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createMemoryHistory,
  createRouter,
  type RouteRecordRaw,
} from "vue-router";

const sessionState = {
  status: { value: "unauthenticated" as "loading" | "authenticated" | "unauthenticated" },
  isProfileComplete: { value: false as boolean },
  hasIdentityDocument: { value: false as boolean },
  ready: vi.fn(async () => {}),
};

vi.mock("@/features/auth", () => ({
  useAuthSession: () => sessionState,
}));

const routes: RouteRecordRaw[] = [
  { path: "/", name: "home", redirect: { name: "events-list" } },
  {
    path: "/events",
    name: "events-list",
    component: { template: "<div/>" },
  },
  {
    path: "/events/:id",
    name: "event-detail",
    component: { template: "<div/>" },
  },
  { path: "/login", name: "login", component: { template: "<div/>" }, meta: { public: true } },
  {
    path: "/signup/profile",
    name: "signup-profile",
    component: { template: "<div/>" },
  },
  {
    path: "/signup/identity",
    name: "signup-identity",
    component: { template: "<div/>" },
  },
  {
    path: "/auth/callback",
    name: "auth-callback",
    component: { template: "<div/>" },
    meta: { public: true },
  },
  {
    path: "/auth/link-sent",
    name: "auth-link-sent",
    component: { template: "<div/>" },
    meta: { public: true },
  },
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
  {
    path: "/protected",
    name: "protected",
    component: { template: "<div/>" },
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  sessionState.ready.mockResolvedValue(undefined);
  sessionState.hasIdentityDocument.value = false;
});

afterEach(() => {
  vi.restoreAllMocks();
});

async function createTestRouter(initial: string) {
  const { registerAuthGuard } = await import("./router");
  const router = createRouter({ history: createMemoryHistory(), routes });
  registerAuthGuard(router);
  await router.push(initial);
  await router.isReady();
  return router;
}

describe("auth guard", () => {
  it("未認証 + / → /login (ランディング廃止により認証必須)", async () => {
    sessionState.status.value = "unauthenticated";
    const router = await createTestRouter("/");
    expect(router.currentRoute.value.name).toBe("login");
  });

  it("未認証 + 保護ルート → /login", async () => {
    sessionState.status.value = "unauthenticated";
    const router = await createTestRouter("/protected");
    expect(router.currentRoute.value.name).toBe("login");
  });

  it("未認証 + /signup/profile → /login (認証必須)", async () => {
    sessionState.status.value = "unauthenticated";
    const router = await createTestRouter("/signup/profile");
    expect(router.currentRoute.value.name).toBe("login");
  });

  it("認証済み + プロフィール未完成 + / → /signup/profile", async () => {
    sessionState.status.value = "authenticated";
    sessionState.isProfileComplete.value = false;
    const router = await createTestRouter("/");
    expect(router.currentRoute.value.name).toBe("signup-profile");
  });

  it("認証済み + プロフィール未完成 + /signup/profile → 通過", async () => {
    sessionState.status.value = "authenticated";
    sessionState.isProfileComplete.value = false;
    const router = await createTestRouter("/signup/profile");
    expect(router.currentRoute.value.name).toBe("signup-profile");
  });

  it("認証済み + プロフィール未完成 + /auth/callback → 通過", async () => {
    sessionState.status.value = "authenticated";
    sessionState.isProfileComplete.value = false;
    const router = await createTestRouter("/auth/callback");
    expect(router.currentRoute.value.name).toBe("auth-callback");
  });

  it("認証済み + プロフィール完成 + 書類提出済 + /login → /events", async () => {
    sessionState.status.value = "authenticated";
    sessionState.isProfileComplete.value = true;
    sessionState.hasIdentityDocument.value = true;
    const router = await createTestRouter("/login");
    expect(router.currentRoute.value.name).toBe("events-list");
  });

  it("認証済み + プロフィール完成 + 書類提出済 + /signup/profile → /events", async () => {
    sessionState.status.value = "authenticated";
    sessionState.isProfileComplete.value = true;
    sessionState.hasIdentityDocument.value = true;
    const router = await createTestRouter("/signup/profile");
    expect(router.currentRoute.value.name).toBe("events-list");
  });

  it("認証済み + プロフィール完成 + /protected → 通過 (書類提出済み)", async () => {
    sessionState.status.value = "authenticated";
    sessionState.isProfileComplete.value = true;
    sessionState.hasIdentityDocument.value = true;
    const router = await createTestRouter("/protected");
    expect(router.currentRoute.value.name).toBe("protected");
  });

  it("認証済み + プロフィール完成 + 書類提出済 + / → /events に redirect", async () => {
    sessionState.status.value = "authenticated";
    sessionState.isProfileComplete.value = true;
    sessionState.hasIdentityDocument.value = true;
    const router = await createTestRouter("/");
    expect(router.currentRoute.value.name).toBe("events-list");
  });

  it("認証済み + プロフィール完成 + 書類提出済 + /events → 通過 (#90)", async () => {
    sessionState.status.value = "authenticated";
    sessionState.isProfileComplete.value = true;
    sessionState.hasIdentityDocument.value = true;
    const router = await createTestRouter("/events");
    expect(router.currentRoute.value.name).toBe("events-list");
  });

  it("認証済み + プロフィール完成 + 書類提出済 + /events/:id → 通過 (#90)", async () => {
    sessionState.status.value = "authenticated";
    sessionState.isProfileComplete.value = true;
    sessionState.hasIdentityDocument.value = true;
    const router = await createTestRouter(
      "/events/11111111-1111-1111-1111-111111111111",
    );
    expect(router.currentRoute.value.name).toBe("event-detail");
  });
});

describe("auth guard — hasIdentityDocument 分岐 (#92)", () => {
  it("認証済 + プロフィール完成 + 書類未提出 + / → /signup/identity 強制誘導", async () => {
    sessionState.status.value = "authenticated";
    sessionState.isProfileComplete.value = true;
    sessionState.hasIdentityDocument.value = false;
    const router = await createTestRouter("/");
    expect(router.currentRoute.value.name).toBe("signup-identity");
  });

  it("認証済 + プロフィール完成 + 書類未提出 + /protected → /signup/identity 強制誘導", async () => {
    sessionState.status.value = "authenticated";
    sessionState.isProfileComplete.value = true;
    sessionState.hasIdentityDocument.value = false;
    const router = await createTestRouter("/protected");
    expect(router.currentRoute.value.name).toBe("signup-identity");
  });

  it("認証済 + プロフィール完成 + 書類未提出 + /signup/identity → 通過 (無限ループ防止)", async () => {
    sessionState.status.value = "authenticated";
    sessionState.isProfileComplete.value = true;
    sessionState.hasIdentityDocument.value = false;
    const router = await createTestRouter("/signup/identity");
    expect(router.currentRoute.value.name).toBe("signup-identity");
  });

  it("認証済 + プロフィール完成 + 書類未提出 + /auth/callback → 通過", async () => {
    sessionState.status.value = "authenticated";
    sessionState.isProfileComplete.value = true;
    sessionState.hasIdentityDocument.value = false;
    const router = await createTestRouter("/auth/callback");
    expect(router.currentRoute.value.name).toBe("auth-callback");
  });

  it("認証済 + プロフィール完成 + 書類提出済 + /signup/identity 直リン → /events", async () => {
    sessionState.status.value = "authenticated";
    sessionState.isProfileComplete.value = true;
    sessionState.hasIdentityDocument.value = true;
    const router = await createTestRouter("/signup/identity");
    expect(router.currentRoute.value.name).toBe("events-list");
  });
});

describe("auth guard — /profile (#91)", () => {
  it("未認証 + /profile → /login", async () => {
    sessionState.status.value = "unauthenticated";
    const router = await createTestRouter("/profile");
    expect(router.currentRoute.value.name).toBe("login");
  });

  it("認証済 + プロフィール未完成 + /profile → /signup/profile", async () => {
    sessionState.status.value = "authenticated";
    sessionState.isProfileComplete.value = false;
    const router = await createTestRouter("/profile");
    expect(router.currentRoute.value.name).toBe("signup-profile");
  });

  it("認証済 + プロフィール完成 + 書類未提出 + /profile → /signup/identity", async () => {
    sessionState.status.value = "authenticated";
    sessionState.isProfileComplete.value = true;
    sessionState.hasIdentityDocument.value = false;
    const router = await createTestRouter("/profile");
    expect(router.currentRoute.value.name).toBe("signup-identity");
  });

  it("認証済 + プロフィール完成 + 書類提出済 + /profile → 通過 (ProfilePage 描画)", async () => {
    sessionState.status.value = "authenticated";
    sessionState.isProfileComplete.value = true;
    sessionState.hasIdentityDocument.value = true;
    const router = await createTestRouter("/profile");
    expect(router.currentRoute.value.name).toBe("profile");
  });
});

describe("auth guard — /history (#211)", () => {
  it("未認証 + /history → /login", async () => {
    sessionState.status.value = "unauthenticated";
    const router = await createTestRouter("/history");
    expect(router.currentRoute.value.name).toBe("login");
  });

  it("認証済 + プロフィール未完成 + /history → /signup/profile", async () => {
    sessionState.status.value = "authenticated";
    sessionState.isProfileComplete.value = false;
    const router = await createTestRouter("/history");
    expect(router.currentRoute.value.name).toBe("signup-profile");
  });

  it("認証済 + プロフィール完成 + 書類未提出 + /history → /signup/identity", async () => {
    sessionState.status.value = "authenticated";
    sessionState.isProfileComplete.value = true;
    sessionState.hasIdentityDocument.value = false;
    const router = await createTestRouter("/history");
    expect(router.currentRoute.value.name).toBe("signup-identity");
  });

  it("認証済 + プロフィール完成 + 書類提出済 + /history → 通過 (HistoryPage 描画)", async () => {
    sessionState.status.value = "authenticated";
    sessionState.isProfileComplete.value = true;
    sessionState.hasIdentityDocument.value = true;
    const router = await createTestRouter("/history");
    expect(router.currentRoute.value.name).toBe("history");
  });
});
