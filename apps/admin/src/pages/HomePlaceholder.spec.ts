import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { ref } from "vue";
import { createMemoryHistory, createRouter, type Router } from "vue-router";
import HomePlaceholder from "./HomePlaceholder.vue";

const signOutMock = vi.fn();

vi.mock("@/features/auth", () => ({
  useAuthSession: () => ({
    status: ref<"loading" | "authenticated" | "unauthenticated">(
      "authenticated",
    ),
    aal: ref<"aal1" | "aal2">("aal2"),
    isAdmin: ref<boolean | null>(true),
    hasMfaFactor: ref<boolean>(true),
    ready: () => Promise.resolve(),
    signOut: signOutMock,
    refresh: () => Promise.resolve(),
  }),
}));

let router: Router;

beforeEach(() => {
  vi.clearAllMocks();
  signOutMock.mockResolvedValue(undefined);
  router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", name: "home", component: HomePlaceholder },
      { path: "/login", name: "login", component: { template: "<div/>" } },
    ],
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("HomePlaceholder", () => {
  it("ログアウトボタンが表示される", async () => {
    await router.push("/");
    await router.isReady();
    const wrapper = mount(HomePlaceholder, { global: { plugins: [router] } });
    expect(
      wrapper.findAll("button").some((b) => b.text().includes("ログアウト")),
    ).toBe(true);
  });

  it("ログアウトボタン押下で signOut が呼ばれ /login に遷移", async () => {
    await router.push("/");
    await router.isReady();
    const wrapper = mount(HomePlaceholder, { global: { plugins: [router] } });

    const logout = wrapper
      .findAll("button")
      .find((b) => b.text().includes("ログアウト"));
    expect(logout).toBeDefined();

    await logout!.trigger("click");
    await flushPromises();

    expect(signOutMock).toHaveBeenCalled();
    expect(router.currentRoute.value.path).toBe("/login");
  });
});
