import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter, type Router } from "vue-router";
import LoginPage from "./LoginPage.vue";

const sendMock = vi.fn();
const resetMock = vi.fn();

const sendState = {
  status: { value: "idle" as "idle" | "loading" | "success" | "error" },
  error: { value: null as string | null },
  submittedEmail: { value: "" },
  send: sendMock,
  reset: resetMock,
};

vi.mock("@/features/auth", () => ({
  useSendMagicLink: () => sendState,
}));

let router: Router;

beforeEach(() => {
  vi.clearAllMocks();
  sendState.status.value = "idle";
  sendState.error.value = null;
  sendState.submittedEmail.value = "";

  router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", component: { template: "<div/>" } },
      { path: "/login", name: "login", component: LoginPage },
    ],
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

async function mountAt(query: Record<string, string> = {}) {
  await router.push({ path: "/login", query });
  await router.isReady();
  const wrapper = mount(LoginPage, {
    global: { plugins: [router] },
  });
  await flushPromises();
  return wrapper;
}

describe("LoginPage", () => {
  it("Empty 状態: 入力欄と CTA が表示される", async () => {
    const wrapper = await mountAt();
    expect(wrapper.find("input[type=email]").exists()).toBe(true);
    expect(wrapper.text()).toContain("マジックリンクを送る");
    const cta = wrapper.find("button[type=submit]");
    expect(cta.exists()).toBe(true);
  });

  it("送信ボタン押下で send が呼ばれる", async () => {
    sendMock.mockResolvedValue(undefined);
    const wrapper = await mountAt();

    await wrapper.find("input[type=email]").setValue("owner@high-q.club");
    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();

    expect(sendMock).toHaveBeenCalledWith("owner@high-q.club");
  });

  it("Loading 状態: CTA が disabled、ラベルが切り替わる", async () => {
    sendState.status.value = "loading";
    const wrapper = await mountAt();
    const cta = wrapper.find("button[type=submit]");
    expect(cta.attributes("disabled")).toBeDefined();
    expect(wrapper.text()).toContain("送信中");
  });

  it("Success 状態: 完了文言と再送リンクが表示される", async () => {
    sendState.status.value = "success";
    sendState.submittedEmail.value = "owner@high-q.club";
    const wrapper = await mountAt();
    expect(wrapper.text()).toContain("メールを送信しました");
    expect(wrapper.text()).toContain("owner@high-q.club");
    expect(wrapper.text()).toContain("別のメールアドレスを使う");
  });

  it("Success 状態の reset リンクで reset が呼ばれる", async () => {
    sendState.status.value = "success";
    sendState.submittedEmail.value = "owner@high-q.club";
    const wrapper = await mountAt();
    await wrapper
      .findAll("button")
      .find((b) => b.text().includes("別のメールアドレス"))
      ?.trigger("click");
    expect(resetMock).toHaveBeenCalled();
  });

  it("Error 状態 (invalid-email) でバナー表示", async () => {
    sendState.status.value = "error";
    sendState.error.value = "invalid-email";
    const wrapper = await mountAt();
    expect(wrapper.text()).toContain("メールアドレス");
    expect(wrapper.find('[role="alert"]').exists()).toBe(true);
  });

  it("?reason=not-admin で Error バナーが表示される", async () => {
    const wrapper = await mountAt({ reason: "not-admin" });
    expect(wrapper.find('[role="alert"]').exists()).toBe(true);
    expect(wrapper.text()).toContain("管理者権限");
  });

  it("?reason=link-invalid で Error バナーが表示される", async () => {
    const wrapper = await mountAt({ reason: "link-invalid" });
    expect(wrapper.find('[role="alert"]').exists()).toBe(true);
    expect(wrapper.text()).toContain("リンク");
  });

  it("?reason=session-timeout で Error バナーが表示される", async () => {
    const wrapper = await mountAt({ reason: "session-timeout" });
    expect(wrapper.find('[role="alert"]').exists()).toBe(true);
    expect(wrapper.text()).toContain("セッション");
  });
});
