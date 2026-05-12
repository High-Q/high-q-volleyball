import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { defineComponent, ref } from "vue";

const verifySubmitMock = vi.fn();
const verifyStatus = ref<"idle" | "loading" | "success" | "error">("idle");
const verifyErrorCode = ref<string | null>(null);
const remainingAttempts = ref<number | null>(null);

const sessionRefreshMock = vi.fn(async () => {});
const hasIdentityDocument = ref(false);

vi.mock("@/features/auth", () => ({
  useAuthSession: () => ({
    refresh: sessionRefreshMock,
    hasIdentityDocument,
  }),
  useVerifySignupCode: () => ({
    status: verifyStatus,
    errorCode: verifyErrorCode,
    remainingAttempts,
    submit: verifySubmitMock,
    reset: vi.fn(),
  }),
  useRequestSignupCode: () => ({
    status: ref("idle"),
    errorCode: ref(null),
    fieldErrors: ref({}),
    expiresAt: ref(null),
    retryAfterSec: ref(null),
    submit: vi.fn(),
    reset: vi.fn(),
  }),
}));

const Stub = defineComponent({ template: "<div/>" });
const routes = [
  { path: "/", name: "home", component: Stub },
  { path: "/login", name: "login", component: Stub },
  { path: "/signup", name: "signup", component: Stub },
  { path: "/signup/verify", name: "signup-verify", component: Stub },
  { path: "/signup/identity", name: "signup-identity", component: Stub },
  { path: "/events/:id", name: "event-detail", component: Stub },
];

beforeEach(() => {
  vi.clearAllMocks();
  verifyStatus.value = "idle";
  verifyErrorCode.value = null;
  remainingAttempts.value = null;
  hasIdentityDocument.value = false;
  verifySubmitMock.mockResolvedValue(true);
});

afterEach(() => {
  vi.restoreAllMocks();
});

async function mountPage(query = "?email=rem%40example.com") {
  const SignupVerifyPage = (await import("./SignupVerifyPage.vue")).default;
  const router = createRouter({ history: createMemoryHistory(), routes });
  await router.push("/signup/verify" + query);
  await router.isReady();
  const wrapper = mount(SignupVerifyPage, { global: { plugins: [router] } });
  await flushPromises();
  return { wrapper, router };
}

describe("SignupVerifyPage (#189)", () => {
  it("Empty 状態: 6 桁入力欄 + CTA + 再送リンク + メール変更リンクが出る", async () => {
    const { wrapper } = await mountPage();
    expect(wrapper.text()).toContain("メールに届いた");
    expect(wrapper.text()).toContain("rem@example.com");
    expect(wrapper.find('[data-testid="verify-code-input"]').exists()).toBe(true);
    expect(wrapper.text()).toContain("コードを再送する");
    expect(wrapper.text()).toContain("メールアドレスを変更する");
    // CTA は code 未入力で disabled
    const cta = wrapper.findAll("button").find((b) => b.text().includes("認証する"));
    expect(cta?.attributes("disabled")).toBeDefined();
  });

  it("クエリパラメータ email なしで /signup にリダイレクト", async () => {
    const { router } = await mountPage("");
    await flushPromises();
    expect(router.currentRoute.value.name).toBe("signup");
  });

  it("Loading 状態: CTA が「認証中…」になり disabled", async () => {
    verifyStatus.value = "loading";
    const { wrapper } = await mountPage();
    expect(wrapper.text()).toContain("認証中…");
    const cta = wrapper.findAll("button").find((b) => b.text().includes("認証中"));
    expect(cta?.attributes("disabled")).toBeDefined();
  });

  it("Error (invalid-code) で remainingAttempts を表示", async () => {
    verifyStatus.value = "error";
    verifyErrorCode.value = "invalid-code";
    remainingAttempts.value = 3;
    const { wrapper } = await mountPage();
    expect(wrapper.find('[data-testid="verify-banner"]').text()).toContain(
      "残り 3 回",
    );
  });

  it("Error (expired) で「最初からやり直す」CTA を表示", async () => {
    verifyStatus.value = "error";
    verifyErrorCode.value = "expired";
    const { wrapper } = await mountPage();
    expect(wrapper.find('[data-testid="verify-banner"]').text()).toContain(
      "有効期限",
    );
    expect(wrapper.text()).toContain("最初からやり直す");
  });

  it("Error (attempt-exceeded) で「最初からやり直す」CTA を表示", async () => {
    verifyStatus.value = "error";
    verifyErrorCode.value = "attempt-exceeded";
    const { wrapper } = await mountPage();
    expect(wrapper.find('[data-testid="verify-banner"]').text()).toContain(
      "試行回数",
    );
    expect(wrapper.text()).toContain("最初からやり直す");
  });

  it("Error (session-failed) で「ログイン画面へ」CTA を表示", async () => {
    verifyStatus.value = "error";
    verifyErrorCode.value = "session-failed";
    const { wrapper } = await mountPage();
    expect(wrapper.text()).toContain("ログインの確立に失敗");
    expect(wrapper.text()).toContain("ログイン画面へ");
  });

  it("CTA 押下で submit が呼ばれ、成功で /signup/identity に遷移（書類未提出のとき）", async () => {
    verifySubmitMock.mockImplementation(async () => {
      verifyStatus.value = "success";
      return true;
    });
    hasIdentityDocument.value = false;
    const { wrapper, router } = await mountPage();
    const codeInput = wrapper.find('[data-testid="verify-code-input"]');
    await codeInput.setValue("123456");
    const cta = wrapper.findAll("button").find((b) => b.text().includes("認証する"));
    await cta!.trigger("submit");
    await flushPromises();
    expect(verifySubmitMock).toHaveBeenCalledWith("rem@example.com", "123456");
    expect(router.currentRoute.value.name).toBe("signup-identity");
  });

  it("成功で書類提出済みなら /home に遷移", async () => {
    verifySubmitMock.mockImplementation(async () => {
      verifyStatus.value = "success";
      return true;
    });
    hasIdentityDocument.value = true;
    const { wrapper, router } = await mountPage();
    const codeInput = wrapper.find('[data-testid="verify-code-input"]');
    await codeInput.setValue("123456");
    const cta = wrapper.findAll("button").find((b) => b.text().includes("認証する"));
    await cta!.trigger("submit");
    await flushPromises();
    expect(router.currentRoute.value.name).toBe("home");
  });

  it("「メールアドレスを変更する」リンクで /signup に email を保持して戻る", async () => {
    const { wrapper, router } = await mountPage();
    const links = wrapper.findAll("button").filter((b) =>
      b.text().includes("メールアドレスを変更する"),
    );
    expect(links.length).toBeGreaterThan(0);
    await links[0]!.trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.name).toBe("signup");
    expect(router.currentRoute.value.query.email).toBe("rem@example.com");
  });

  it("#229: ?next=... で書類未提出時は /signup/identity に next を引き継ぐ", async () => {
    verifySubmitMock.mockImplementation(async () => {
      verifyStatus.value = "success";
      return true;
    });
    hasIdentityDocument.value = false;
    const { wrapper, router } = await mountPage(
      "?email=rem%40example.com&next=%2Fevents%2Fabc-123",
    );
    const codeInput = wrapper.find('[data-testid="verify-code-input"]');
    await codeInput.setValue("123456");
    const cta = wrapper.findAll("button").find((b) => b.text().includes("認証する"));
    await cta!.trigger("submit");
    await flushPromises();
    expect(router.currentRoute.value.name).toBe("signup-identity");
    expect(router.currentRoute.value.query.next).toBe("/events/abc-123");
  });

  it("#229: ?next=... で書類提出済みなら next 先 (/events/<id>) に直接 navigate", async () => {
    verifySubmitMock.mockImplementation(async () => {
      verifyStatus.value = "success";
      return true;
    });
    hasIdentityDocument.value = true;
    const { wrapper, router } = await mountPage(
      "?email=rem%40example.com&next=%2Fevents%2Fabc-123",
    );
    const codeInput = wrapper.find('[data-testid="verify-code-input"]');
    await codeInput.setValue("123456");
    const cta = wrapper.findAll("button").find((b) => b.text().includes("認証する"));
    await cta!.trigger("submit");
    await flushPromises();
    expect(router.currentRoute.value.name).toBe("event-detail");
    expect(router.currentRoute.value.params.id).toBe("abc-123");
  });

  it("「コードを再送する」リンクで /signup に email を保持して戻る", async () => {
    const { wrapper, router } = await mountPage();
    const links = wrapper.findAll("button").filter((b) =>
      b.text().includes("コードを再送する"),
    );
    expect(links.length).toBeGreaterThan(0);
    await links[0]!.trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.name).toBe("signup");
    expect(router.currentRoute.value.query.email).toBe("rem@example.com");
  });
});
