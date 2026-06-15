import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { ref } from "vue";
import { createMemoryHistory, createRouter, type Router } from "vue-router";
import AuthCallbackPage from "./AuthCallbackPage.vue";

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

let router: Router;

beforeEach(() => {
  vi.clearAllMocks();
  session.status.value = "loading";
  session.aal.value = "aal1";
  session.hasMfaFactor.value = false;
  session.isAdmin.value = null;
  session.ready.mockResolvedValue(undefined);
  session.signOut.mockResolvedValue(undefined);

  router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", name: "dashboard", component: { template: "<div/>" } },
      { path: "/events", name: "events", component: { template: "<div/>" } },
      { path: "/login", name: "login", component: { template: "<div/>" } },
      { path: "/mfa", name: "mfa", component: { template: "<div/>" } },
      {
        path: "/mfa/setup",
        name: "mfa-setup",
        component: { template: "<div/>" },
      },
      {
        path: "/auth/callback",
        name: "auth-callback",
        component: AuthCallbackPage,
      },
    ],
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

async function mountAt(path: string) {
  await router.push(path);
  await router.isReady();
  const wrapper = mount(AuthCallbackPage, {
    global: { plugins: [router] },
  });
  await flushPromises();
  return wrapper;
}

describe("AuthCallbackPage", () => {
  it("マウント時に Loading メッセージを表示する (ready 解決前)", async () => {
    let resolveReady!: () => void;
    session.ready.mockImplementation(
      () => new Promise<void>((r) => (resolveReady = r)),
    );

    await router.push("/auth/callback");
    await router.isReady();
    const wrapper = mount(AuthCallbackPage, {
      global: { plugins: [router] },
    });
    expect(wrapper.text()).toContain("サインインしています");

    resolveReady();
    await flushPromises();
  });

  it("AAL2 admin で / (dashboard) にリダイレクト", async () => {
    session.status.value = "authenticated";
    session.aal.value = "aal2";
    session.isAdmin.value = true;

    await mountAt("/auth/callback");
    expect(router.currentRoute.value.path).toBe("/");
  });

  it("AAL1 + factor 未登録で /mfa/setup にリダイレクト", async () => {
    session.status.value = "authenticated";
    session.aal.value = "aal1";
    session.hasMfaFactor.value = false;

    await mountAt("/auth/callback");
    expect(router.currentRoute.value.path).toBe("/mfa/setup");
  });

  it("AAL1 + factor 登録済みで /mfa にリダイレクト", async () => {
    session.status.value = "authenticated";
    session.aal.value = "aal1";
    session.hasMfaFactor.value = true;

    await mountAt("/auth/callback");
    expect(router.currentRoute.value.path).toBe("/mfa");
  });

  it("AAL2 非 admin で signOut + /login?reason=not-admin", async () => {
    session.status.value = "authenticated";
    session.aal.value = "aal2";
    session.isAdmin.value = false;

    await mountAt("/auth/callback");
    expect(session.signOut).toHaveBeenCalled();
    expect(router.currentRoute.value.path).toBe("/login");
    expect(router.currentRoute.value.query.reason).toBe("not-admin");
  });

  it("認証失敗 (unauthenticated) は /login?reason=link-invalid", async () => {
    session.status.value = "unauthenticated";

    await mountAt("/auth/callback");
    expect(router.currentRoute.value.path).toBe("/login");
    expect(router.currentRoute.value.query.reason).toBe("link-invalid");
  });
});
