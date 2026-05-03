import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { defineComponent, ref } from "vue";

const submitMock = vi.fn();
const status = ref<"idle" | "loading" | "success" | "error">("idle");
const error = ref<string | null>(null);
const fieldErrors = ref<Record<string, string>>({});

const sessionRef = {
  session: { value: { user: { email: "test@example.com" } } },
};

vi.mock("@/features/auth", () => ({
  useCompleteProfile: () => ({
    status,
    error,
    fieldErrors,
    submit: submitMock,
    reset: vi.fn(),
  }),
  useAuthSession: () => sessionRef,
}));

const Stub = defineComponent({ template: "<div/>" });
const routes = [
  { path: "/", name: "home", component: Stub },
  { path: "/signup/profile", name: "signup-profile", component: Stub },
];

beforeEach(() => {
  vi.clearAllMocks();
  status.value = "idle";
  error.value = null;
  fieldErrors.value = {};
  submitMock.mockImplementation(async () => {
    status.value = "success";
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

async function mountAt(path = "/signup/profile") {
  const SignupProfilePage = (await import("./SignupProfilePage.vue")).default;
  const router = createRouter({ history: createMemoryHistory(), routes });
  await router.push(path);
  await router.isReady();
  const wrapper = mount(SignupProfilePage, { global: { plugins: [router] } });
  await flushPromises();
  return { wrapper, router };
}

describe("SignupProfilePage (段階2: 情報入力 + UPDATE)", () => {
  it("メール認証完了文言 + 全フィールド + CTA disabled (同意 OFF)", async () => {
    const { wrapper } = await mountAt();
    expect(wrapper.text()).toContain("メール認証が完了しました");
    expect(wrapper.text()).toContain("test@example.com");
    expect(wrapper.find('input[autocomplete="name"]').exists()).toBe(true);
    expect(wrapper.find('input[type="date"]').exists()).toBe(true);
    expect(wrapper.find('input[type="tel"]').exists()).toBe(true);
    expect(wrapper.find('input[type="checkbox"]').exists()).toBe(true);
    const cta = wrapper.findAll("button").find((b) => b.text().includes("登録する"));
    expect(cta?.attributes("disabled")).toBeDefined();
  });

  it("利用規約チェックで CTA 活性化", async () => {
    const { wrapper } = await mountAt();
    await wrapper.find('input[type="checkbox"]').setValue(true);
    const cta = wrapper.findAll("button").find((b) => b.text().includes("登録する"));
    expect(cta?.attributes("disabled")).toBeUndefined();
  });

  it("送信時に submit が呼ばれ、success で / に遷移", async () => {
    const { wrapper, router } = await mountAt();
    await wrapper.find('input[autocomplete="name"]').setValue("田中 美咲");
    await wrapper.find('input[type="date"]').setValue("1995-03-15");
    await wrapper.find('input[type="tel"]').setValue("090-1234-5678");
    await wrapper.find('input[type="checkbox"]').setValue(true);
    const cta = wrapper.findAll("button").find((b) => b.text().includes("登録する"));
    await cta?.trigger("click");
    await flushPromises();
    expect(submitMock).toHaveBeenCalled();
    expect(router.currentRoute.value.name).toBe("home");
  });

  it("バリデーションエラー (氏名) 表示", async () => {
    submitMock.mockImplementation(async () => {
      status.value = "error";
      error.value = "validation";
      fieldErrors.value = { display_name: "お名前を入力してください" };
    });
    const { wrapper } = await mountAt();
    await wrapper.find('input[type="checkbox"]').setValue(true);
    const cta = wrapper.findAll("button").find((b) => b.text().includes("登録する"));
    await cta?.trigger("click");
    await flushPromises();
    expect(wrapper.text()).toContain("お名前を入力してください");
  });

  it("Loading 中は CTA 「登録中…」 + disabled", async () => {
    submitMock.mockImplementation(async () => {
      status.value = "loading";
    });
    const { wrapper } = await mountAt();
    await wrapper.find('input[type="checkbox"]').setValue(true);
    const cta = wrapper.findAll("button").find((b) => b.text().includes("登録する"));
    await cta?.trigger("click");
    await flushPromises();
    const after = wrapper.findAll("button").find((b) => b.text().includes("登録中"));
    expect(after).toBeTruthy();
    expect(after?.attributes("disabled")).toBeDefined();
  });

  it("network エラーバナー", async () => {
    submitMock.mockImplementation(async () => {
      status.value = "error";
      error.value = "network";
    });
    const { wrapper } = await mountAt();
    await wrapper.find('input[type="checkbox"]').setValue(true);
    const cta = wrapper.findAll("button").find((b) => b.text().includes("登録する"));
    await cta?.trigger("click");
    await flushPromises();
    expect(wrapper.text()).toContain("ネットワーク");
  });

  it("reason=profile-update-failed バナー表示", async () => {
    const { wrapper } = await mountAt("/signup/profile?reason=profile-update-failed");
    expect(wrapper.text()).toContain("プロフィールの登録に失敗");
  });
});
