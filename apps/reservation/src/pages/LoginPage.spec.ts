import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { defineComponent, ref } from "vue";

const sendMock = vi.fn();
const status = ref<"idle" | "loading" | "success" | "error">("idle");
const error = ref<string | null>(null);

vi.mock("@/features/auth", () => ({
  useSendMagicLink: () => ({
    status,
    error,
    submittedEmail: ref(""),
    send: sendMock,
    reset: vi.fn(),
  }),
}));

const Stub = defineComponent({ template: "<div/>" });
const routes = [
  { path: "/", name: "home", component: Stub },
  { path: "/login", name: "login", component: Stub },
  { path: "/signup", name: "signup", component: Stub },
  { path: "/auth/link-sent", name: "auth-link-sent", component: Stub },
];

beforeEach(() => {
  vi.clearAllMocks();
  status.value = "idle";
  error.value = null;
  sendMock.mockImplementation(async () => {
    status.value = "success";
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

async function mountAt(path = "/login") {
  const LoginPage = (await import("./LoginPage.vue")).default;
  const router = createRouter({ history: createMemoryHistory(), routes });
  await router.push(path);
  await router.isReady();
  const wrapper = mount(LoginPage, { global: { plugins: [router] } });
  await flushPromises();
  return { wrapper, router };
}

describe("LoginPage (login = signup 兼用)", () => {
  it("Empty 状態: ヘッダー + 「はじめる」見出し + 入力 + CTA + ABOUT カード", async () => {
    const { wrapper } = await mountAt();
    expect(wrapper.find('input[type="email"]').exists()).toBe(true);
    // ヘッダー
    expect(wrapper.text()).toContain("High Q");
    expect(wrapper.text()).toContain("EST.21");
    // メイン見出し (デザインサンプル: 「はじめる」)
    expect(wrapper.text()).toContain("はじめる");
    expect(wrapper.text()).toContain("メールアドレスを入力してください");
    // 説明
    expect(wrapper.text()).toContain("社会人バレーボールサークル");
    // CTA (新文言)
    expect(wrapper.text()).toContain("メールでリンクを受け取る");
    // ABOUT カード
    expect(wrapper.text()).toContain("月1〜2回");
    expect(wrapper.text()).toContain("初心者歓迎");
    expect(wrapper.text()).toContain("会費無料");
    // フッター
    expect(wrapper.text()).toContain("サークルについて詳しく");
    // 廃止された要素
    expect(wrapper.text()).not.toContain("ゲストとして");
  });

  it("CTA 押下で send が shouldCreateUser:true で呼ばれ、success で /auth/link-sent に遷移", async () => {
    const { wrapper, router } = await mountAt();
    await wrapper.find('input[type="email"]').setValue("a@example.com");
    await wrapper.find("form").trigger("submit");
    await flushPromises();
    expect(sendMock).toHaveBeenCalledWith("a@example.com", { shouldCreateUser: true });
    expect(router.currentRoute.value.name).toBe("auth-link-sent");
    expect(router.currentRoute.value.query.email).toBe("a@example.com");
  });

  it("Loading 中は CTA 「送信中…」", async () => {
    sendMock.mockImplementation(async () => {
      status.value = "loading";
      await new Promise((r) => setTimeout(r, 0));
    });
    const { wrapper } = await mountAt();
    await wrapper.find('input[type="email"]').setValue("a@example.com");
    wrapper.find("form").trigger("submit");
    await flushPromises();
    expect(wrapper.text()).toContain("送信中");
    // CTA は disabled
    const cta = wrapper.findAll("button").find((b) => b.text().includes("送信中"));
    expect(cta?.attributes("disabled")).toBeDefined();
  });

  it("reason=link-invalid バナー表示 + URL クエリ除去", async () => {
    const replaceStateSpy = vi.spyOn(window.history, "replaceState");
    const { wrapper } = await mountAt("/login?reason=link-invalid");
    expect(wrapper.text()).toContain("リンクの有効期限");
    expect(replaceStateSpy).toHaveBeenCalled();
  });

  it("Error 状態 (rate-limit) 表示", async () => {
    sendMock.mockImplementation(async () => {
      status.value = "error";
      error.value = "rate-limit";
    });
    const { wrapper } = await mountAt();
    await wrapper.find('input[type="email"]').setValue("a@example.com");
    await wrapper.find("form").trigger("submit");
    await flushPromises();
    expect(wrapper.text()).toContain("送信回数の上限");
  });

  it("Error 状態 (invalid-email) 表示", async () => {
    sendMock.mockImplementation(async () => {
      status.value = "error";
      error.value = "invalid-email";
    });
    const { wrapper } = await mountAt();
    await wrapper.find('input[type="email"]').setValue("not-email");
    await wrapper.find("form").trigger("submit");
    await flushPromises();
    expect(wrapper.text()).toContain("形式が正しくありません");
  });
});
