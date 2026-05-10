import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { defineComponent } from "vue";

const sessionState = {
  status: { value: "loading" as "loading" | "authenticated" | "unauthenticated" },
  session: {
    value: null as null | { user: { id: string; email: string } },
  },
  isProfileComplete: { value: false as boolean },
  ready: vi.fn(async () => {}),
};

vi.mock("@/features/auth", () => ({
  useAuthSession: () => sessionState,
}));

const Stub = defineComponent({ template: "<div/>" });
const routes = [
  { path: "/", name: "home", component: Stub },
  { path: "/login", name: "login", component: Stub },
  { path: "/auth/callback", name: "auth-callback", component: Stub },
];

beforeEach(() => {
  vi.clearAllMocks();
  sessionState.ready.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

async function mountPage() {
  const AuthCallbackPage = (await import("./AuthCallbackPage.vue")).default;
  const router = createRouter({ history: createMemoryHistory(), routes });
  await router.push("/auth/callback");
  await router.isReady();
  const wrapper = mount(AuthCallbackPage, { global: { plugins: [router] } });
  await flushPromises();
  return { wrapper, router };
}

describe("AuthCallbackPage", () => {
  it("Loading 表示で「サインインしています…」", async () => {
    sessionState.ready.mockImplementation(() => new Promise(() => {}));
    const AuthCallbackPage = (await import("./AuthCallbackPage.vue")).default;
    const wrapper = mount(AuthCallbackPage, {
      global: {
        plugins: [createRouter({ history: createMemoryHistory(), routes })],
      },
    });
    expect(wrapper.text()).toContain("サインインしています");
  });

  it("session 確立失敗で /login?reason=link-invalid", async () => {
    sessionState.status.value = "unauthenticated";
    sessionState.session.value = null;
    const { router } = await mountPage();
    expect(router.currentRoute.value.name).toBe("login");
    expect(router.currentRoute.value.query.reason).toBe("link-invalid");
  });

  it("session 確立で / にリダイレクト (#189: プロフィール未完成分岐は廃止)", async () => {
    sessionState.status.value = "authenticated";
    sessionState.session.value = { user: { id: "u1", email: "u@example.com" } };
    sessionState.isProfileComplete.value = true;
    const { router } = await mountPage();
    expect(router.currentRoute.value.name).toBe("home");
  });
});
