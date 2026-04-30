import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter, type Router } from "vue-router";
import { ref } from "vue";
import MfaSetupPage from "./MfaSetupPage.vue";

const enrollMock = vi.fn();
const submitMock = vi.fn();
const resetMock = vi.fn();

const enrollment = {
  status: ref<
    "idle" | "enrolling" | "awaiting-code" | "verifying" | "success" | "error"
  >("idle"),
  error: ref<string | null>(null),
  qrCode: ref<string>(""),
  secret: ref<string>(""),
  uri: ref<string>(""),
  factorId: ref<string>(""),
  enroll: enrollMock,
  submitCode: submitMock,
  reset: resetMock,
};

vi.mock("@/features/auth", () => ({
  useMfaEnrollment: () => enrollment,
}));

const { qrCodeMock } = vi.hoisted(() => ({
  qrCodeMock: vi.fn(() => Promise.resolve("<svg>QR</svg>")),
}));

vi.mock("qrcode", () => ({
  default: { toString: qrCodeMock },
}));

let router: Router;

beforeEach(() => {
  vi.clearAllMocks();
  enrollment.status.value = "idle";
  enrollment.error.value = null;
  enrollment.qrCode.value = "";
  enrollment.secret.value = "";
  enrollment.uri.value = "";
  enrollment.factorId.value = "";

  enrollMock.mockResolvedValue(undefined);
  submitMock.mockResolvedValue(undefined);

  router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", name: "home", component: { template: "<div/>" } },
      { path: "/events", name: "events", component: { template: "<div/>" } },
      { path: "/mfa/setup", name: "mfa-setup", component: MfaSetupPage },
    ],
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

async function mountAt() {
  await router.push("/mfa/setup");
  await router.isReady();
  const wrapper = mount(MfaSetupPage, {
    global: { plugins: [router] },
  });
  await flushPromises();
  return wrapper;
}

describe("MfaSetupPage", () => {
  it("マウント時に enroll() が呼ばれる", async () => {
    await mountAt();
    expect(enrollMock).toHaveBeenCalled();
  });

  it("Loading 状態 (enrolling) でメッセージ表示", async () => {
    enrollment.status.value = "enrolling";
    const wrapper = await mountAt();
    expect(wrapper.text()).toContain("準備中");
  });

  it("awaiting-code 状態で QR コード SVG / secret / 入力欄が表示される", async () => {
    enrollment.status.value = "awaiting-code";
    enrollment.uri.value = "otpauth://totp/...";
    enrollment.secret.value = "BASE32SECRET";
    enrollment.factorId.value = "f1";

    const wrapper = await mountAt();
    await flushPromises();
    await wrapper.vm.$nextTick();
    await flushPromises();

    expect(qrCodeMock).toHaveBeenCalled();
    expect(wrapper.html()).toContain("<svg>QR</svg>");
    expect(wrapper.text()).toContain("BASE32SECRET");
    expect(wrapper.find("input[name=mfa-code]").exists()).toBe(true);
    expect(wrapper.text()).toContain("認証アプリ");
  });

  it("コード入力 + 送信で submitCode が呼ばれる", async () => {
    enrollment.status.value = "awaiting-code";
    enrollment.uri.value = "otpauth://";
    enrollment.factorId.value = "f1";
    const wrapper = await mountAt();

    await wrapper.find("input[name=mfa-code]").setValue("123456");
    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();

    expect(submitMock).toHaveBeenCalledWith("123456");
  });

  it("verifying 状態で CTA が disabled", async () => {
    enrollment.status.value = "awaiting-code";
    enrollment.uri.value = "otpauth://";
    const wrapper = await mountAt();

    enrollment.status.value = "verifying";
    await wrapper.vm.$nextTick();

    const cta = wrapper.find("button[type=submit]");
    expect(cta.attributes("disabled")).toBeDefined();
  });

  it("Success 状態で /events に遷移する", async () => {
    enrollment.status.value = "success";
    await mountAt();
    expect(router.currentRoute.value.path).toBe("/events");
  });

  it("Error (invalid-code) でバナー表示 + 再入力可", async () => {
    enrollment.status.value = "awaiting-code";
    enrollment.error.value = "invalid-code";
    enrollment.uri.value = "otpauth://";
    const wrapper = await mountAt();
    expect(wrapper.find('[role="alert"]').exists()).toBe(true);
    expect(wrapper.find("input[name=mfa-code]").exists()).toBe(true);
  });
});
