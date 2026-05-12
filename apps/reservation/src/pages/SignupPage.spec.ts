import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { defineComponent, ref } from "vue";

const submitMock = vi.fn();
const status = ref<"idle" | "loading" | "success" | "error">("idle");
const errorCode = ref<string | null>(null);
const fieldErrors = ref<Record<string, string>>({});
const expiresAt = ref<string | null>(null);
const retryAfterSec = ref<number | null>(null);

vi.mock("@/features/auth", () => ({
  useRequestSignupCode: () => ({
    status,
    errorCode,
    fieldErrors,
    expiresAt,
    retryAfterSec,
    submit: submitMock,
    reset: vi.fn(),
  }),
}));

const Stub = defineComponent({ template: "<div/>" });
const routes = [
  { path: "/", name: "home", component: Stub },
  { path: "/login", name: "login", component: Stub },
  { path: "/signup", name: "signup", component: Stub },
  { path: "/signup/verify", name: "signup-verify", component: Stub },
  { path: "/events/:id", name: "event-detail", component: Stub },
];

beforeEach(() => {
  vi.clearAllMocks();
  status.value = "idle";
  errorCode.value = null;
  fieldErrors.value = {};
  expiresAt.value = null;
  retryAfterSec.value = null;
  submitMock.mockResolvedValue(true);
});

afterEach(() => {
  vi.restoreAllMocks();
});

async function mountPage(initial = "/signup") {
  const SignupPage = (await import("./SignupPage.vue")).default;
  const router = createRouter({ history: createMemoryHistory(), routes });
  await router.push(initial);
  await router.isReady();
  const wrapper = mount(SignupPage, { global: { plugins: [router] } });
  await flushPromises();
  return { wrapper, router };
}

async function fillValidForm(wrapper: Awaited<ReturnType<typeof mountPage>>["wrapper"]) {
  const inputs = wrapper.findAll("input");
  await inputs[0]!.setValue("rem@example.com"); // email
  await inputs[1]!.setValue("レム テスト"); // display_name
  await inputs[2]!.setValue("レム"); // nickname
  await inputs[3]!.setValue("1995-03-15"); // birthday
  await inputs[4]!.setValue("090-1234-5678"); // phone
  // experience_level radios are inputs 5/6/7 — beginner is default
  // terms checkbox
  const termsCheckbox = inputs[inputs.length - 1]!;
  await termsCheckbox.setValue(true);
}

describe("SignupPage (#189)", () => {
  it("Empty 状態: ヘッダー + 全項目入力欄 + CTA + PolicyFooter が出る", async () => {
    const { wrapper } = await mountPage();
    expect(wrapper.text()).toContain("会員登録を");
    expect(wrapper.text()).toContain("はじめましょう");
    expect(wrapper.text()).toContain("認証コードを送信する");
    expect(wrapper.find('input[type="email"]').exists()).toBe(true);
    expect(wrapper.find('input[type="date"]').exists()).toBe(true);
    expect(wrapper.find('input[type="tel"]').exists()).toBe(true);
    expect(wrapper.find('input[type="checkbox"]').exists()).toBe(true);
    // CTA は同意 OFF のため disabled
    const cta = wrapper.findAll("button").find((b) => b.text().includes("認証コードを送信する"));
    expect(cta?.attributes("disabled")).toBeDefined();
  });

  it("Loading 状態: CTA が「送信中…」になり disabled", async () => {
    status.value = "loading";
    const { wrapper } = await mountPage();
    expect(wrapper.text()).toContain("送信中…");
    const cta = wrapper.findAll("button").find((b) => b.text().includes("送信中"));
    expect(cta?.attributes("disabled")).toBeDefined();
  });

  it("Error 状態 (network): バナー表示", async () => {
    status.value = "error";
    errorCode.value = "network";
    const { wrapper } = await mountPage();
    expect(wrapper.find('[data-testid="signup-banner"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="signup-banner"]').text()).toContain(
      "ネットワークエラー",
    );
  });

  it("Error 状態 (rate-limited): retryAfter を表示", async () => {
    status.value = "error";
    errorCode.value = "rate-limited";
    retryAfterSec.value = 30;
    const { wrapper } = await mountPage();
    expect(wrapper.find('[data-testid="signup-banner"]').text()).toContain(
      "30 秒",
    );
  });

  it("Error 状態 (mail-send-failed): メール送信失敗の表示", async () => {
    status.value = "error";
    errorCode.value = "mail-send-failed";
    const { wrapper } = await mountPage();
    expect(wrapper.find('[data-testid="signup-banner"]').text()).toContain(
      "認証コードメールの送信に失敗",
    );
  });

  it("既登録エラーで /signup から /login へのリンクが出る", async () => {
    status.value = "error";
    errorCode.value = "already-registered";
    fieldErrors.value = { email: "このメールアドレスは既に登録済みです" };
    const { wrapper } = await mountPage();
    expect(wrapper.text()).toContain("既に登録済み");
    const loginLinks = wrapper.findAll("a").filter((a) => /ログイン/.test(a.text()));
    expect(loginLinks.length).toBeGreaterThan(0);
  });

  it("CTA 押下で submit が呼ばれ、成功で /signup/verify に email クエリ付きで遷移", async () => {
    submitMock.mockResolvedValue(true);
    const { wrapper, router } = await mountPage();
    await fillValidForm(wrapper);
    await flushPromises();
    const cta = wrapper
      .findAll("button")
      .find((b) => b.text().includes("認証コードを送信する"));
    expect(cta?.attributes("disabled")).toBeUndefined();
    await cta!.trigger("click");
    await flushPromises();
    expect(submitMock).toHaveBeenCalledTimes(1);
    expect(router.currentRoute.value.name).toBe("signup-verify");
    expect(router.currentRoute.value.query.email).toBe("rem@example.com");
  });

  it("submit 失敗時は /signup/verify へ遷移しない", async () => {
    submitMock.mockResolvedValue(false);
    const { wrapper, router } = await mountPage();
    await fillValidForm(wrapper);
    const cta = wrapper
      .findAll("button")
      .find((b) => b.text().includes("認証コードを送信する"));
    await cta!.trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.name).toBe("signup");
  });

  it("#229: /signup?next=... で送信成功時 /signup/verify に next が引き継がれる", async () => {
    submitMock.mockResolvedValue(true);
    const { wrapper, router } = await mountPage(
      "/signup?next=%2Fevents%2Fabc-123",
    );
    await fillValidForm(wrapper);
    const cta = wrapper
      .findAll("button")
      .find((b) => b.text().includes("認証コードを送信する"));
    await cta!.trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.name).toBe("signup-verify");
    expect(router.currentRoute.value.query.next).toBe("/events/abc-123");
  });

  it("#229: 不正な next 値 (絶対 URL) は引き継がれない", async () => {
    submitMock.mockResolvedValue(true);
    const { wrapper, router } = await mountPage(
      "/signup?next=https%3A%2F%2Fevil.example.com",
    );
    await fillValidForm(wrapper);
    const cta = wrapper
      .findAll("button")
      .find((b) => b.text().includes("認証コードを送信する"));
    await cta!.trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.query.next).toBeUndefined();
  });

  it("PolicyFooter の Privacy リンクが LP オリジンを指す", async () => {
    const { wrapper } = await mountPage();
    const link = wrapper.find('[data-testid="signup-privacy-link"]');
    expect(link.exists()).toBe(true);
    expect(link.attributes("target")).toBe("_blank");
    expect(link.attributes("href")).toContain("/privacy");
  });
});
