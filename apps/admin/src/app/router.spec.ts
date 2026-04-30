import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryHistory, createRouter, type Router } from "vue-router";
import { ref } from "vue";

const session = {
  status: ref<"loading" | "authenticated" | "unauthenticated">("loading"),
  aal: ref<"aal1" | "aal2">("aal1"),
  hasMfaFactor: ref<boolean>(false),
  isAdmin: ref<boolean | null>(null),
  ready: vi.fn(),
  signOut: vi.fn(),
  refresh: vi.fn(),
};

vi.mock("@/features/auth", () => ({
  useAuthSession: () => session,
}));

beforeEach(() => {
  vi.clearAllMocks();
  session.status.value = "unauthenticated";
  session.aal.value = "aal1";
  session.hasMfaFactor.value = false;
  session.isAdmin.value = null;
  session.ready.mockResolvedValue(undefined);
  session.signOut.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

async function createTestRouter(): Promise<Router> {
  const { routes, registerAuthGuard } = await import("./router");
  const router = createRouter({
    history: createMemoryHistory(),
    routes,
  });
  registerAuthGuard(router);
  return router;
}

describe("router auth guard", () => {
  it("未認証で / にアクセスすると /login にリダイレクトされる", async () => {
    const router = await createTestRouter();
    await router.push("/");
    await router.isReady();
    expect(router.currentRoute.value.path).toBe("/login");
  });

  it("AAL1 + factor 未登録で / にアクセスすると /mfa/setup にリダイレクトされる", async () => {
    session.status.value = "authenticated";
    session.aal.value = "aal1";
    session.hasMfaFactor.value = false;

    const router = await createTestRouter();
    await router.push("/");
    await router.isReady();
    expect(router.currentRoute.value.path).toBe("/mfa/setup");
  });

  it("AAL1 + factor 登録済みで / にアクセスすると /mfa にリダイレクトされる", async () => {
    session.status.value = "authenticated";
    session.aal.value = "aal1";
    session.hasMfaFactor.value = true;

    const router = await createTestRouter();
    await router.push("/");
    await router.isReady();
    expect(router.currentRoute.value.path).toBe("/mfa");
  });

  it("AAL2 admin で / にアクセスすると /events にリダイレクトされる", async () => {
    session.status.value = "authenticated";
    session.aal.value = "aal2";
    session.isAdmin.value = true;

    const router = await createTestRouter();
    await router.push("/");
    await router.isReady();
    expect(router.currentRoute.value.path).toBe("/events");
  });

  it("AAL2 非 admin で / にアクセスすると signOut + /login?reason=not-admin", async () => {
    session.status.value = "authenticated";
    session.aal.value = "aal2";
    session.isAdmin.value = false;

    const router = await createTestRouter();
    await router.push("/");
    await router.isReady();

    expect(session.signOut).toHaveBeenCalled();
    expect(router.currentRoute.value.path).toBe("/login");
    expect(router.currentRoute.value.query.reason).toBe("not-admin");
  });

  it("AAL2 admin が /login にアクセスすると /events にリダイレクトされる", async () => {
    session.status.value = "authenticated";
    session.aal.value = "aal2";
    session.isAdmin.value = true;

    const router = await createTestRouter();
    await router.push("/login");
    await router.isReady();
    expect(router.currentRoute.value.path).toBe("/events");
  });

  it("/auth/callback は AAL や状態にかかわらず通過する (公開ルート)", async () => {
    session.status.value = "unauthenticated";
    const router = await createTestRouter();
    await router.push("/auth/callback");
    await router.isReady();
    expect(router.currentRoute.value.path).toBe("/auth/callback");
  });

  it("AAL1 ユーザーが /mfa にアクセスすると通過する", async () => {
    session.status.value = "authenticated";
    session.aal.value = "aal1";
    session.hasMfaFactor.value = true;

    const router = await createTestRouter();
    await router.push("/mfa");
    await router.isReady();
    expect(router.currentRoute.value.path).toBe("/mfa");
  });

  it("AAL2 admin が /mfa にアクセスすると /events にリダイレクトされる", async () => {
    session.status.value = "authenticated";
    session.aal.value = "aal2";
    session.isAdmin.value = true;

    const router = await createTestRouter();
    await router.push("/mfa");
    await router.isReady();
    expect(router.currentRoute.value.path).toBe("/events");
  });

  it("未認証で /events にアクセスすると /login にリダイレクトされる", async () => {
    const router = await createTestRouter();
    await router.push("/events");
    await router.isReady();
    expect(router.currentRoute.value.path).toBe("/login");
  });

  it("AAL2 admin で /events にアクセスすると通過する", async () => {
    session.status.value = "authenticated";
    session.aal.value = "aal2";
    session.isAdmin.value = true;

    const router = await createTestRouter();
    await router.push("/events");
    await router.isReady();
    expect(router.currentRoute.value.path).toBe("/events");
  });

  it("AAL2 admin で /events/new にアクセスすると通過する（プレースホルダ）", async () => {
    session.status.value = "authenticated";
    session.aal.value = "aal2";
    session.isAdmin.value = true;

    const router = await createTestRouter();
    await router.push("/events/new");
    await router.isReady();
    expect(router.currentRoute.value.path).toBe("/events/new");
  });

  it("未認証で /events/new にアクセスすると /login にリダイレクトされる", async () => {
    const router = await createTestRouter();
    await router.push("/events/new");
    await router.isReady();
    expect(router.currentRoute.value.path).toBe("/login");
  });
});

describe("router routes", () => {
  it("7 つのルートが定義されている（/ redirect + /events + /events/new + 既存 4）", async () => {
    const { routes } = await import("./router");
    const paths = routes.map((r) => r.path).sort();
    expect(paths).toEqual([
      "/",
      "/auth/callback",
      "/events",
      "/events/new",
      "/login",
      "/mfa",
      "/mfa/setup",
    ]);
  });

  it("/ ルートは /events への redirect", async () => {
    const { routes } = await import("./router");
    const root = routes.find((r) => r.path === "/");
    expect(root?.redirect).toBeDefined();
  });

  it("/login と /auth/callback は meta.public=true", async () => {
    const { routes } = await import("./router");
    expect(routes.find((r) => r.path === "/login")?.meta?.public).toBe(true);
    expect(routes.find((r) => r.path === "/auth/callback")?.meta?.public).toBe(
      true,
    );
  });
});
