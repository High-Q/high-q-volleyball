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
  { path: "/", name: "home", component: { template: "<div/>" } },
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

  it("認証済み + プロフィール完成 + 書類提出済 + /login → /", async () => {
    sessionState.status.value = "authenticated";
    sessionState.isProfileComplete.value = true;
    sessionState.hasIdentityDocument.value = true;
    const router = await createTestRouter("/login");
    expect(router.currentRoute.value.name).toBe("home");
  });

  it("認証済み + プロフィール完成 + 書類提出済 + /signup/profile → /", async () => {
    sessionState.status.value = "authenticated";
    sessionState.isProfileComplete.value = true;
    sessionState.hasIdentityDocument.value = true;
    const router = await createTestRouter("/signup/profile");
    expect(router.currentRoute.value.name).toBe("home");
  });

  it("認証済み + プロフィール完成 + /protected → 通過 (書類提出済み)", async () => {
    sessionState.status.value = "authenticated";
    sessionState.isProfileComplete.value = true;
    sessionState.hasIdentityDocument.value = true;
    const router = await createTestRouter("/protected");
    expect(router.currentRoute.value.name).toBe("protected");
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

  it("認証済 + プロフィール完成 + 書類提出済 + /signup/identity 直リン → /", async () => {
    sessionState.status.value = "authenticated";
    sessionState.isProfileComplete.value = true;
    sessionState.hasIdentityDocument.value = true;
    const router = await createTestRouter("/signup/identity");
    expect(router.currentRoute.value.name).toBe("home");
  });
});
