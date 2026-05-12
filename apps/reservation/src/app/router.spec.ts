import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createMemoryHistory,
  createRouter,
  type RouteRecordRaw,
} from "vue-router";

const sessionState = {
  status: { value: "unauthenticated" as "loading" | "authenticated" | "unauthenticated" },
  // #189 ゼロ滞留 signup フロー導入後、認証済み = プロフィール完成済みが
  // 不変条件のため isProfileComplete 分岐は guard で参照されない。状態は残すが
  // テスト上は常に true を維持する（admin / Phase 1 既存会員と同じ振る舞い）。
  isProfileComplete: { value: true as boolean },
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
    path: "/signup",
    name: "signup",
    component: { template: "<div/>" },
    meta: { public: true },
  },
  {
    path: "/signup/verify",
    name: "signup-verify",
    component: { template: "<div/>" },
    meta: { public: true },
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
  sessionState.isProfileComplete.value = true;
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

  it("未認証 + /signup → 通過 (新規登録は public)", async () => {
    sessionState.status.value = "unauthenticated";
    const router = await createTestRouter("/signup");
    expect(router.currentRoute.value.name).toBe("signup");
  });

  it("未認証 + /signup/verify → 通過 (コード検証は public)", async () => {
    sessionState.status.value = "unauthenticated";
    const router = await createTestRouter("/signup/verify?email=x@example.com");
    expect(router.currentRoute.value.name).toBe("signup-verify");
  });

  it("認証済み + プロフィール完成 + 書類提出済 + /login → /events", async () => {
    sessionState.status.value = "authenticated";
    sessionState.hasIdentityDocument.value = true;
    const router = await createTestRouter("/login");
    expect(router.currentRoute.value.name).toBe("events-list");
  });

  it("認証済み + プロフィール完成 + 書類提出済 + /signup → /events (重複登録防止)", async () => {
    sessionState.status.value = "authenticated";
    sessionState.hasIdentityDocument.value = true;
    const router = await createTestRouter("/signup");
    expect(router.currentRoute.value.name).toBe("events-list");
  });

  it("認証済み + プロフィール完成 + 書類提出済 + /signup/verify → /events", async () => {
    sessionState.status.value = "authenticated";
    sessionState.hasIdentityDocument.value = true;
    const router = await createTestRouter("/signup/verify");
    expect(router.currentRoute.value.name).toBe("events-list");
  });

  it("認証済み + プロフィール完成 + /protected → 通過 (書類提出済み)", async () => {
    sessionState.status.value = "authenticated";
    sessionState.hasIdentityDocument.value = true;
    const router = await createTestRouter("/protected");
    expect(router.currentRoute.value.name).toBe("protected");
  });

  it("認証済み + プロフィール完成 + 書類提出済 + / → /events に redirect", async () => {
    sessionState.status.value = "authenticated";
    sessionState.hasIdentityDocument.value = true;
    const router = await createTestRouter("/");
    expect(router.currentRoute.value.name).toBe("events-list");
  });

  it("認証済み + プロフィール完成 + 書類提出済 + /events → 通過 (#90)", async () => {
    sessionState.status.value = "authenticated";
    sessionState.hasIdentityDocument.value = true;
    const router = await createTestRouter("/events");
    expect(router.currentRoute.value.name).toBe("events-list");
  });

  it("認証済み + プロフィール完成 + 書類提出済 + /events/:id → 通過 (#90)", async () => {
    sessionState.status.value = "authenticated";
    sessionState.hasIdentityDocument.value = true;
    const router = await createTestRouter(
      "/events/11111111-1111-1111-1111-111111111111",
    );
    expect(router.currentRoute.value.name).toBe("event-detail");
  });
});

describe("auth guard — hasIdentityDocument 分岐 (#92)", () => {
  it("認証済 + 書類未提出 + / → /signup/identity 強制誘導", async () => {
    sessionState.status.value = "authenticated";
    sessionState.hasIdentityDocument.value = false;
    const router = await createTestRouter("/");
    expect(router.currentRoute.value.name).toBe("signup-identity");
  });

  it("認証済 + 書類未提出 + /protected → /signup/identity 強制誘導", async () => {
    sessionState.status.value = "authenticated";
    sessionState.hasIdentityDocument.value = false;
    const router = await createTestRouter("/protected");
    expect(router.currentRoute.value.name).toBe("signup-identity");
  });

  it("認証済 + 書類未提出 + /signup/identity → 通過 (無限ループ防止)", async () => {
    sessionState.status.value = "authenticated";
    sessionState.hasIdentityDocument.value = false;
    const router = await createTestRouter("/signup/identity");
    expect(router.currentRoute.value.name).toBe("signup-identity");
  });

  it("認証済 + 書類未提出 + /auth/callback → 通過", async () => {
    sessionState.status.value = "authenticated";
    sessionState.hasIdentityDocument.value = false;
    const router = await createTestRouter("/auth/callback");
    expect(router.currentRoute.value.name).toBe("auth-callback");
  });

  it("認証済 + 書類提出済 + /signup/identity 直リン → /events", async () => {
    sessionState.status.value = "authenticated";
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

  it("認証済 + 書類未提出 + /profile → /signup/identity", async () => {
    sessionState.status.value = "authenticated";
    sessionState.hasIdentityDocument.value = false;
    const router = await createTestRouter("/profile");
    expect(router.currentRoute.value.name).toBe("signup-identity");
  });

  it("認証済 + 書類提出済 + /profile → 通過 (ProfilePage 描画)", async () => {
    sessionState.status.value = "authenticated";
    sessionState.hasIdentityDocument.value = true;
    const router = await createTestRouter("/profile");
    expect(router.currentRoute.value.name).toBe("profile");
  });
});

describe("auth guard — next クエリ保持 (#229)", () => {
  it("未認証 + /events/:id → /login?next=%2Fevents%2F<id>", async () => {
    sessionState.status.value = "unauthenticated";
    const router = await createTestRouter(
      "/events/11111111-1111-1111-1111-111111111111",
    );
    expect(router.currentRoute.value.name).toBe("login");
    expect(router.currentRoute.value.query.next).toBe(
      "/events/11111111-1111-1111-1111-111111111111",
    );
  });

  it("未認証 + 任意の保護ルート (/protected) でも next が付与される", async () => {
    sessionState.status.value = "unauthenticated";
    const router = await createTestRouter("/protected?foo=bar");
    expect(router.currentRoute.value.name).toBe("login");
    expect(router.currentRoute.value.query.next).toBe("/protected?foo=bar");
  });

  it("未認証 + /login 直アクセスは next を付与しない (循環防止)", async () => {
    sessionState.status.value = "unauthenticated";
    const router = await createTestRouter("/login");
    expect(router.currentRoute.value.name).toBe("login");
    expect(router.currentRoute.value.query.next).toBeUndefined();
  });

  it("未認証 + /auth/callback 直アクセスは guard 通過 (next 付与対象外)", async () => {
    sessionState.status.value = "unauthenticated";
    const router = await createTestRouter("/auth/callback");
    expect(router.currentRoute.value.name).toBe("auth-callback");
  });

  it("認証済 + 書類提出済 + /login?next=%2Fevents%2F<id> → /events/<id> に直接 navigate", async () => {
    sessionState.status.value = "authenticated";
    sessionState.hasIdentityDocument.value = true;
    const router = await createTestRouter(
      "/login?next=%2Fevents%2F11111111-1111-1111-1111-111111111111",
    );
    expect(router.currentRoute.value.name).toBe("event-detail");
    expect(router.currentRoute.value.params.id).toBe(
      "11111111-1111-1111-1111-111111111111",
    );
  });

  it("認証済 + 書類提出済 + /signup?next=... → next 先に直接 navigate", async () => {
    sessionState.status.value = "authenticated";
    sessionState.hasIdentityDocument.value = true;
    const router = await createTestRouter("/signup?next=%2Fhistory");
    expect(router.currentRoute.value.name).toBe("history");
  });

  it("認証済 + /login?next=https%3A%2F%2Fevil.example.com → 不正値破棄で /events", async () => {
    sessionState.status.value = "authenticated";
    sessionState.hasIdentityDocument.value = true;
    const router = await createTestRouter(
      "/login?next=https%3A%2F%2Fevil.example.com",
    );
    expect(router.currentRoute.value.name).toBe("events-list");
  });

  it("認証済 + 書類未提出 + /protected?next=%2Fevents%2F<id> → /signup/identity?next=... 引き継ぎ", async () => {
    sessionState.status.value = "authenticated";
    sessionState.hasIdentityDocument.value = false;
    const router = await createTestRouter(
      "/protected?next=%2Fevents%2F11111111-1111-1111-1111-111111111111",
    );
    expect(router.currentRoute.value.name).toBe("signup-identity");
    expect(router.currentRoute.value.query.next).toBe(
      "/events/11111111-1111-1111-1111-111111111111",
    );
  });
});

describe("auth guard — /history (#211)", () => {
  it("未認証 + /history → /login", async () => {
    sessionState.status.value = "unauthenticated";
    const router = await createTestRouter("/history");
    expect(router.currentRoute.value.name).toBe("login");
  });

  it("認証済 + 書類未提出 + /history → /signup/identity", async () => {
    sessionState.status.value = "authenticated";
    sessionState.hasIdentityDocument.value = false;
    const router = await createTestRouter("/history");
    expect(router.currentRoute.value.name).toBe("signup-identity");
  });

  it("認証済 + 書類提出済 + /history → 通過 (HistoryPage 描画)", async () => {
    sessionState.status.value = "authenticated";
    sessionState.hasIdentityDocument.value = true;
    const router = await createTestRouter("/history");
    expect(router.currentRoute.value.name).toBe("history");
  });
});
