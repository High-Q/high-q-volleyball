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
  { path: "/login", name: "login", component: Stub },
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

async function mountAt(path: string) {
  const LinkSentPage = (await import("./LinkSentPage.vue")).default;
  const router = createRouter({ history: createMemoryHistory(), routes });
  await router.push(path);
  await router.isReady();
  const wrapper = mount(LinkSentPage, { global: { plugins: [router] } });
  await flushPromises();
  return { wrapper, router };
}

describe("LinkSentPage", () => {
  it("送信先メールアドレスを表示", async () => {
    const { wrapper } = await mountAt("/auth/link-sent?email=misaki%40example.com");
    expect(wrapper.text()).toContain("misaki@example.com");
    expect(wrapper.text()).toContain("メールを送信しました");
  });

  it("再送ボタンで send が shouldCreateUser:true で再実行 (login = signup 兼用)", async () => {
    const { wrapper } = await mountAt("/auth/link-sent?email=a%40example.com");
    const buttons = wrapper.findAll("button");
    const resendBtn = buttons.find((b) => b.text().includes("再送"));
    await resendBtn?.trigger("click");
    await flushPromises();
    expect(sendMock).toHaveBeenCalledWith("a@example.com", { shouldCreateUser: true });
  });

  it("Loading 中は再送ボタン disabled + 「送信中…」", async () => {
    sendMock.mockImplementation(async () => {
      status.value = "loading";
    });
    const { wrapper } = await mountAt("/auth/link-sent?email=a%40example.com");
    const resendBtn = wrapper
      .findAll("button")
      .find((b) => b.text().includes("再送") || b.text().includes("送信中"));
    await resendBtn?.trigger("click");
    await flushPromises();
    expect(wrapper.text()).toContain("送信中");
  });

  it("rate-limit エラー表示", async () => {
    sendMock.mockImplementation(async () => {
      status.value = "error";
      error.value = "rate-limit";
    });
    const { wrapper } = await mountAt("/auth/link-sent?email=a%40example.com");
    const resendBtn = wrapper.findAll("button").find((b) => b.text().includes("再送"));
    await resendBtn?.trigger("click");
    await flushPromises();
    expect(wrapper.text()).toContain("約 60 秒");
  });

  it("「別のアドレスを使う」で /login に戻る", async () => {
    const { wrapper, router } = await mountAt("/auth/link-sent?email=a%40example.com");
    const link = wrapper.findAll("button").find((b) => b.text().includes("別のアドレス"));
    await link?.trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.name).toBe("login");
  });
});
