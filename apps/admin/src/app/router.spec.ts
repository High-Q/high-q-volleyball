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
  it("12 つのルートが定義されている (events 5 + members 1 + identity-documents 2 + auth 4)", async () => {
    const { routes } = await import("./router");
    const paths = routes.map((r) => r.path).sort();
    expect(paths).toEqual([
      "/",
      "/auth/callback",
      "/events",
      "/events/:id",
      "/events/:id/edit",
      "/events/new",
      "/identity-documents",
      "/identity-documents/:id",
      "/login",
      "/members",
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

  it("/identity-documents は meta.public 無し (admin 認証下)", async () => {
    const { routes } = await import("./router");
    const route = routes.find((r) => r.path === "/identity-documents");
    expect(route?.meta?.public).toBeUndefined();
  });

  it("/identity-documents/:id は meta.public 無し (admin 認証下)", async () => {
    const { routes } = await import("./router");
    const route = routes.find((r) => r.path === "/identity-documents/:id");
    expect(route?.meta?.public).toBeUndefined();
  });
});

describe("router auth guard — /identity-documents (#171)", () => {
  it("未認証で /identity-documents にアクセスすると /login にリダイレクト", async () => {
    const router = await createTestRouter();
    await router.push("/identity-documents");
    await router.isReady();
    expect(router.currentRoute.value.path).toBe("/login");
  });

  it("未認証で /identity-documents/:id にアクセスすると /login にリダイレクト", async () => {
    const router = await createTestRouter();
    await router.push("/identity-documents/abc");
    await router.isReady();
    expect(router.currentRoute.value.path).toBe("/login");
  });

  it("AAL1 で /identity-documents にアクセスすると /mfa or /mfa/setup", async () => {
    session.status.value = "authenticated";
    session.aal.value = "aal1";
    session.hasMfaFactor.value = true;

    const router = await createTestRouter();
    await router.push("/identity-documents");
    await router.isReady();
    expect(router.currentRoute.value.path).toBe("/mfa");
  });

  it("AAL2 admin で /identity-documents が描画される (リダイレクトなし)", async () => {
    session.status.value = "authenticated";
    session.aal.value = "aal2";
    session.isAdmin.value = true;

    const router = await createTestRouter();
    await router.push("/identity-documents");
    await router.isReady();
    expect(router.currentRoute.value.path).toBe("/identity-documents");
    expect(router.currentRoute.value.name).toBe("identity-documents");
  });

  it("AAL2 admin で /identity-documents/:id が描画される", async () => {
    session.status.value = "authenticated";
    session.aal.value = "aal2";
    session.isAdmin.value = true;

    const router = await createTestRouter();
    await router.push("/identity-documents/doc-1");
    await router.isReady();
    expect(router.currentRoute.value.path).toBe("/identity-documents/doc-1");
    expect(router.currentRoute.value.name).toBe("identity-document-detail");
    expect(router.currentRoute.value.params.id).toBe("doc-1");
  });

  it("AAL2 + 非 admin で /identity-documents → /login?reason=not-admin", async () => {
    session.status.value = "authenticated";
    session.aal.value = "aal2";
    session.isAdmin.value = false;

    const router = await createTestRouter();
    await router.push("/identity-documents");
    await router.isReady();
    expect(router.currentRoute.value.path).toBe("/login");
    expect(router.currentRoute.value.query.reason).toBe("not-admin");
  });
});

describe("router auth guard — /members (#150)", () => {
  it("未認証で /members にアクセスすると /login にリダイレクト", async () => {
    const router = await createTestRouter();
    await router.push("/members");
    await router.isReady();
    expect(router.currentRoute.value.path).toBe("/login");
  });

  it("AAL1 で /members にアクセスすると /mfa", async () => {
    session.status.value = "authenticated";
    session.aal.value = "aal1";
    session.hasMfaFactor.value = true;

    const router = await createTestRouter();
    await router.push("/members");
    await router.isReady();
    expect(router.currentRoute.value.path).toBe("/mfa");
  });

  it("AAL2 admin で /members が描画される", async () => {
    session.status.value = "authenticated";
    session.aal.value = "aal2";
    session.isAdmin.value = true;

    const router = await createTestRouter();
    await router.push("/members");
    await router.isReady();
    expect(router.currentRoute.value.path).toBe("/members");
    expect(router.currentRoute.value.name).toBe("members");
  });

  it("AAL2 admin で /members?detail=<uuid> も同様に描画される", async () => {
    session.status.value = "authenticated";
    session.aal.value = "aal2";
    session.isAdmin.value = true;

    const router = await createTestRouter();
    await router.push("/members?detail=00000000-0000-0000-0000-000000000001");
    await router.isReady();
    expect(router.currentRoute.value.path).toBe("/members");
    expect(router.currentRoute.value.query.detail).toBe(
      "00000000-0000-0000-0000-000000000001",
    );
  });

  it("AAL2 + 非 admin で /members → /login?reason=not-admin", async () => {
    session.status.value = "authenticated";
    session.aal.value = "aal2";
    session.isAdmin.value = false;

    const router = await createTestRouter();
    await router.push("/members");
    await router.isReady();
    expect(router.currentRoute.value.path).toBe("/login");
    expect(router.currentRoute.value.query.reason).toBe("not-admin");
  });
});
