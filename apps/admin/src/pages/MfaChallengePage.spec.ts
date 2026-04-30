import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { ref } from "vue";
import { createMemoryHistory, createRouter, type Router } from "vue-router";
import MfaChallengePage from "./MfaChallengePage.vue";

const startMock = vi.fn();
const submitMock = vi.fn();
const resetMock = vi.fn();

const challenge = {
  status: ref<
    "idle" | "enrolling" | "awaiting-code" | "verifying" | "success" | "error"
  >("idle"),
  error: ref<string | null>(null),
  factorId: ref<string>(""),
  start: startMock,
  submitCode: submitMock,
  reset: resetMock,
};

vi.mock("@/features/auth", () => ({
  useMfaChallenge: () => challenge,
}));

let router: Router;

beforeEach(() => {
  vi.clearAllMocks();
  challenge.status.value = "idle";
  challenge.error.value = null;
  challenge.factorId.value = "";

  startMock.mockResolvedValue(undefined);
  submitMock.mockResolvedValue(undefined);

  router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", name: "home", component: { template: "<div/>" } },
      { path: "/events", name: "events", component: { template: "<div/>" } },
      {
        path: "/mfa/setup",
        name: "mfa-setup",
        component: { template: "<div/>" },
      },
      { path: "/mfa", name: "mfa", component: MfaChallengePage },
    ],
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

async function mountAt() {
  await router.push("/mfa");
  await router.isReady();
  const wrapper = mount(MfaChallengePage, {
    global: { plugins: [router] },
  });
  await flushPromises();
  return wrapper;
}

describe("MfaChallengePage", () => {
  it("マウント時に start() が呼ばれる", async () => {
    await mountAt();
    expect(startMock).toHaveBeenCalled();
  });

  it("awaiting-code で 6 桁入力欄を表示", async () => {
    challenge.status.value = "awaiting-code";
    const wrapper = await mountAt();
    expect(wrapper.find("input[name=mfa-code]").exists()).toBe(true);
  });

  it("送信で submitCode が呼ばれる", async () => {
    challenge.status.value = "awaiting-code";
    const wrapper = await mountAt();

    await wrapper.find("input[name=mfa-code]").setValue("654321");
    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();

    expect(submitMock).toHaveBeenCalledWith("654321");
  });

  it("verifying 状態で CTA が disabled", async () => {
    challenge.status.value = "awaiting-code";
    const wrapper = await mountAt();
    challenge.status.value = "verifying";
    await wrapper.vm.$nextTick();

    expect(wrapper.find("button[type=submit]").attributes("disabled")).toBeDefined();
  });

  it("Success 状態で /events に遷移", async () => {
    challenge.status.value = "success";
    await mountAt();
    expect(router.currentRoute.value.path).toBe("/events");
  });

  it("Error (invalid-code) でバナー表示 + 再入力可", async () => {
    challenge.status.value = "awaiting-code";
    challenge.error.value = "invalid-code";
    const wrapper = await mountAt();
    expect(wrapper.find('[role="alert"]').exists()).toBe(true);
    expect(wrapper.find("input[name=mfa-code]").exists()).toBe(true);
  });

  it("Error (no-factor) で /mfa/setup にリダイレクト", async () => {
    challenge.status.value = "error";
    challenge.error.value = "no-factor";
    await mountAt();
    expect(router.currentRoute.value.path).toBe("/mfa/setup");
  });
});
