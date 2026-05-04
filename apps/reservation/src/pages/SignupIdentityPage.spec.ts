import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { defineComponent, ref, computed, type ComputedRef, type Ref } from "vue";
import type {
  DocumentType,
  PageState,
  SlotData,
  UploadError,
} from "@/entities/identity-document";

const selectDocumentTypeMock = vi.fn();
const selectFileMock = vi.fn();
const removeFileMock = vi.fn();
const toggleConsentMock = vi.fn();
const submitMock = vi.fn();
const resetMock = vi.fn();

const selectedDocumentType: Ref<DocumentType | null> = ref(null);
const consented: Ref<boolean> = ref(false);
const error: Ref<UploadError | null> = ref(null);
const submitting = ref(false);
const succeeded = ref(false);

const frontSlot: { value: SlotData } = ref<SlotData>({
  state: "empty",
  file: null,
  progress: 0,
}) as unknown as { value: SlotData };
const backSlot: { value: SlotData } = ref<SlotData>({
  state: "empty",
  file: null,
  progress: 0,
}) as unknown as { value: SlotData };

const pageState: ComputedRef<PageState> = computed<PageState>(() => {
  if (succeeded.value) return "success";
  if (submitting.value) return "submitting";
  if (selectedDocumentType.value === null) return "empty";
  return "selecting";
});

const sessionRef = {
  refresh: vi.fn(async () => undefined),
};

vi.mock("@/features/identity-document", () => ({
  useUploadIdentityDocument: () => ({
    pageState,
    selectedDocumentType,
    frontSlot,
    backSlot,
    consented,
    error,
    selectDocumentType: selectDocumentTypeMock,
    selectFile: selectFileMock,
    removeFile: removeFileMock,
    toggleConsent: toggleConsentMock,
    submit: submitMock,
    reset: resetMock,
  }),
}));

vi.mock("@/features/auth", () => ({
  useAuthSession: () => sessionRef,
}));

const Stub = defineComponent({ template: "<div/>" });
const routes = [
  { path: "/", name: "home", component: Stub },
  { path: "/signup/identity", name: "signup-identity", component: Stub },
  { path: "/privacy", name: "privacy", component: Stub },
  {
    path: "/external-transmission",
    name: "external-transmission",
    component: Stub,
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  selectedDocumentType.value = null;
  consented.value = false;
  error.value = null;
  submitting.value = false;
  succeeded.value = false;
  frontSlot.value = { state: "empty", file: null, progress: 0 };
  backSlot.value = { state: "empty", file: null, progress: 0 };

  // jsdom には URL.createObjectURL / revokeObjectURL が無いので、UploadSlot の
  // watch 内で呼ばれてもエラーにならないよう常時 stub する。
  Object.defineProperty(URL, "createObjectURL", {
    value: vi.fn(() => "blob:preview-mock-url"),
    writable: true,
    configurable: true,
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    value: vi.fn(),
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

async function mountPage(initial = "/signup/identity") {
  const SignupIdentityPage = (await import("./SignupIdentityPage.vue")).default;
  const router = createRouter({ history: createMemoryHistory(), routes });
  await router.push(initial);
  await router.isReady();
  const wrapper = mount(SignupIdentityPage, { global: { plugins: [router] } });
  await flushPromises();
  return { wrapper, router };
}

describe("SignupIdentityPage — 初期描画 (empty)", () => {
  it("Step 3 / 3 + 見出し + リード文 + 10 種類のチップが描画される", async () => {
    const { wrapper } = await mountPage();
    expect(wrapper.text()).toContain("STEP 3 / 3");
    expect(wrapper.text()).toContain("本人確認書類を");
    expect(wrapper.text()).toContain("アップロード");
    expect(wrapper.text()).toContain("下記いずれか 1 点");
    expect(wrapper.findAll('button[role="radio"]')).toHaveLength(10);
  });

  it("書類未選択時はアップロードスロットが非表示", async () => {
    const { wrapper } = await mountPage();
    expect(wrapper.find('label[for="upload-slot-front"]').exists()).toBe(false);
  });

  it("CTA は disabled で「送信する」", async () => {
    const { wrapper } = await mountPage();
    const cta = wrapper.findAll("button").find((b) => b.text().includes("送信する"));
    expect(cta?.attributes("disabled")).toBeDefined();
  });

  it("マイナンバーチップに「注意」バッジ + 短縮ラベル「マイナンバー」(1 行収まり) が表示される", async () => {
    const { wrapper } = await mountPage();
    const myNumberChip = wrapper
      .findAll('button[role="radio"]')
      .find((b) => b.text().includes("マイナンバー"));
    expect(myNumberChip).toBeDefined();
    expect(myNumberChip?.text()).toContain("注意");
    // 正式名称「マイナンバーカード (個人番号マスク済み)」(2 行になる) はチップでは使わない
    expect(myNumberChip?.text()).not.toContain("(個人番号マスク済み)");
  });

  it("footer に法令文言とリンク 2 件が含まれる", async () => {
    const { wrapper } = await mountPage();
    expect(wrapper.text()).toContain("プライバシーポリシー");
    expect(wrapper.text()).toContain("外部送信ポリシー");
    expect(wrapper.text()).toContain("Supabase");
  });
});

describe("SignupIdentityPage — チップ選択", () => {
  it("チップクリックで selectDocumentType が呼ばれる", async () => {
    const { wrapper } = await mountPage();
    const chip = wrapper
      .findAll('button[role="radio"]')
      .find((b) => b.text().includes("運転免許証"));
    await chip?.trigger("click");
    expect(selectDocumentTypeMock).toHaveBeenCalledWith("drivers_license");
  });

  it("通常書類選択時は受付条件カードが表示される (— ACCEPTED IF)", async () => {
    selectedDocumentType.value = "drivers_license";
    const { wrapper } = await mountPage();
    expect(wrapper.text()).toContain("ACCEPTED IF");
    expect(wrapper.text()).toContain("有効期間内であること");
  });

  it("マイナンバー選択時は受付条件カードでなく三重防壁が表示される", async () => {
    selectedDocumentType.value = "my_number_card_masked";
    const { wrapper } = await mountPage();
    expect(wrapper.text()).not.toContain("ACCEPTED IF");
    expect(wrapper.text()).toContain("個人番号 (裏面 12 桁) を完全に隠してください");
    expect(wrapper.text()).toContain("マスク不十分");
    expect(wrapper.text()).toContain("マスク適切");
    expect(wrapper.text()).toContain(
      "個人番号を完全に隠して撮影したことを",
    );
  });

  it("通常書類 (運転免許証) は裏面スロットが任意バッジ", async () => {
    selectedDocumentType.value = "drivers_license";
    const { wrapper } = await mountPage();
    expect(wrapper.text()).toContain("表面");
    expect(wrapper.text()).toContain("裏面");
    expect(wrapper.text()).toContain("必須"); // 表面側
    expect(wrapper.text()).toContain("任意"); // 裏面側
  });

  it("在留カードは裏面スロットが必須バッジ (任意は表示されない)", async () => {
    selectedDocumentType.value = "residence_card";
    const { wrapper } = await mountPage();
    // 表面・裏面ともに必須バッジで、任意バッジは出ない
    const requiredBadges = wrapper
      .findAll("span")
      .filter((s) => s.text() === "必須");
    expect(requiredBadges.length).toBeGreaterThanOrEqual(2);
    expect(wrapper.text()).not.toContain("任意");
  });

  it("パスポートも裏面スロットが必須", async () => {
    selectedDocumentType.value = "passport";
    const { wrapper } = await mountPage();
    expect(wrapper.text()).not.toContain("任意");
  });
});

describe("SignupIdentityPage — 裏面ヒントは書類別に切り替わる", () => {
  it("運転免許証: 本籍・住所変更履歴に言及", async () => {
    selectedDocumentType.value = "drivers_license";
    const { wrapper } = await mountPage();
    expect(wrapper.text()).toContain(
      "本籍・住所変更履歴がある場合は裏面も提出してください",
    );
  });

  it("在留カード: 住居地・在留資格の裏面が必須と明示", async () => {
    selectedDocumentType.value = "residence_card";
    const { wrapper } = await mountPage();
    expect(wrapper.text()).toContain("住居地・在留資格の裏面が必須です");
  });

  it("パスポート: 所持人記入欄の裏面が必須と明示", async () => {
    selectedDocumentType.value = "passport";
    const { wrapper } = await mountPage();
    expect(wrapper.text()).toContain(
      "所持人記入欄 (住所) の見開きページが必須です",
    );
  });

  it("健康保険資格確認書: 裏面提出は通常不要と明示", async () => {
    selectedDocumentType.value = "health_insurance_cert";
    const { wrapper } = await mountPage();
    expect(wrapper.text()).toContain("裏面の提出は通常不要です");
  });

  it("マイナンバーカード: 個人番号マスクを促す (三重防壁とは別の裏面ヒント)", async () => {
    selectedDocumentType.value = "my_number_card_masked";
    const { wrapper } = await mountPage();
    expect(wrapper.text()).toContain(
      "裏面を提出する場合は個人番号 12 桁を完全にマスクしてください",
    );
  });

  it("書類未選択時は裏面ヒントが表示されない (旧固定文言「本籍欄・在留情報・見開き」も非表示)", async () => {
    // 初期 (selectedDocumentType=null) では裏面スロット自体が非表示
    const { wrapper } = await mountPage();
    expect(wrapper.text()).not.toContain(
      "本籍欄・在留情報・見開き 2 ページ目",
    );
  });
});

describe("SignupIdentityPage — CTA 状態駆動", () => {
  it("通常書類 + 表面 ready で CTA 活性 (裏面任意)", async () => {
    selectedDocumentType.value = "drivers_license";
    frontSlot.value = {
      state: "ready",
      file: new File([], "front.jpg", { type: "image/jpeg" }),
      progress: 0,
    };
    const { wrapper } = await mountPage();
    const cta = wrapper.findAll("button").find((b) => b.text().includes("送信する"));
    expect(cta?.attributes("disabled")).toBeUndefined();
  });

  it("マイナンバー + 表面 ready + 同意 OFF → CTA disabled", async () => {
    selectedDocumentType.value = "my_number_card_masked";
    frontSlot.value = {
      state: "ready",
      file: new File([], "f.jpg", { type: "image/jpeg" }),
      progress: 0,
    };
    consented.value = false;
    const { wrapper } = await mountPage();
    const cta = wrapper.findAll("button").find((b) => b.text().includes("送信する"));
    expect(cta?.attributes("disabled")).toBeDefined();
  });

  it("マイナンバー + 表面 ready + 同意 ON → CTA 活性", async () => {
    selectedDocumentType.value = "my_number_card_masked";
    frontSlot.value = {
      state: "ready",
      file: new File([], "f.jpg", { type: "image/jpeg" }),
      progress: 0,
    };
    consented.value = true;
    const { wrapper } = await mountPage();
    const cta = wrapper.findAll("button").find((b) => b.text().includes("送信する"));
    expect(cta?.attributes("disabled")).toBeUndefined();
  });

  it("在留カード + 表面のみ ready + 裏面 empty → CTA disabled (back_required)", async () => {
    selectedDocumentType.value = "residence_card";
    frontSlot.value = {
      state: "ready",
      file: new File([], "f.jpg", { type: "image/jpeg" }),
      progress: 0,
    };
    backSlot.value = { state: "empty", file: null, progress: 0 };
    const { wrapper } = await mountPage();
    const cta = wrapper.findAll("button").find((b) => b.text().includes("送信する"));
    expect(cta?.attributes("disabled")).toBeDefined();
  });

  it("在留カード + 表裏両方 ready → CTA 活性", async () => {
    selectedDocumentType.value = "residence_card";
    frontSlot.value = {
      state: "ready",
      file: new File([], "f.jpg", { type: "image/jpeg" }),
      progress: 0,
    };
    backSlot.value = {
      state: "ready",
      file: new File([], "b.jpg", { type: "image/jpeg" }),
      progress: 0,
    };
    const { wrapper } = await mountPage();
    const cta = wrapper.findAll("button").find((b) => b.text().includes("送信する"));
    expect(cta?.attributes("disabled")).toBeUndefined();
  });

  it("submitting 中は CTA「アップロード中…」+ disabled", async () => {
    selectedDocumentType.value = "drivers_license";
    frontSlot.value = {
      state: "uploading",
      file: new File([], "f.jpg", { type: "image/jpeg" }),
      progress: 50,
    };
    submitting.value = true;
    const { wrapper } = await mountPage();
    const cta = wrapper
      .findAll("button")
      .find((b) => b.text().includes("アップロード中"));
    expect(cta?.attributes("disabled")).toBeDefined();
  });

  it("success 状態は CTA「ホームに移動します…」+ disabled (自動遷移のため)", async () => {
    selectedDocumentType.value = "drivers_license";
    frontSlot.value = {
      state: "uploaded",
      file: new File([], "f.jpg", { type: "image/jpeg" }),
      progress: 100,
    };
    succeeded.value = true;
    const { wrapper } = await mountPage();
    const cta = wrapper
      .findAll("button")
      .find((b) => b.text().includes("ホームに移動します"));
    expect(cta).toBeDefined();
    expect(cta?.attributes("disabled")).toBeDefined();
  });

  it("success 遷移時に 1.5 秒後に自動でホームへ遷移する (CTA 押下不要)", async () => {
    vi.useFakeTimers();
    try {
      selectedDocumentType.value = "drivers_license";
      const { router } = await mountPage();
      // success に遷移
      succeeded.value = true;
      await flushPromises();
      // 1500ms 経過前は遷移していない
      expect(router.currentRoute.value.name).toBe("signup-identity");
      await vi.advanceTimersByTimeAsync(1500);
      await flushPromises();
      expect(sessionRef.refresh).toHaveBeenCalled();
      expect(router.currentRoute.value.name).toBe("home");
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("SignupIdentityPage — エラー / 成功バナー", () => {
  it("error=unsupported_format でエラーバナー表示 (role=alert)", async () => {
    selectedDocumentType.value = "drivers_license";
    error.value = "unsupported_format";
    const { wrapper } = await mountPage();
    const banner = wrapper.find('[role="alert"]');
    expect(banner.exists()).toBe(true);
    expect(banner.text()).toContain("ファイル形式が不正です");
  });

  it("error=file_too_large でサイズ超過バナー", async () => {
    selectedDocumentType.value = "drivers_license";
    error.value = "file_too_large";
    const { wrapper } = await mountPage();
    expect(wrapper.text()).toContain("ファイルサイズが大きすぎます");
  });

  it("error=back_required で裏面必須バナー", async () => {
    selectedDocumentType.value = "residence_card";
    error.value = "back_required";
    const { wrapper } = await mountPage();
    expect(wrapper.text()).toContain("裏面の提出が必要です");
  });

  it("success 状態で緑の SuccessBanner 表示 (role=status)", async () => {
    selectedDocumentType.value = "drivers_license";
    succeeded.value = true;
    const { wrapper } = await mountPage();
    const banner = wrapper.find('[role="status"]');
    expect(banner.exists()).toBe(true);
    expect(banner.text()).toContain("アップロードが完了しました");
    expect(banner.text()).toContain("最長 3 日以内");
  });
});

describe("SignupIdentityPage — スロット独立性", () => {
  it("裏面 error は表面 ready を汚染しない (両スロットが独立して描画)", async () => {
    selectedDocumentType.value = "residence_card";
    frontSlot.value = {
      state: "ready",
      file: new File([], "front.jpg", { type: "image/jpeg" }),
      progress: 0,
    };
    backSlot.value = {
      state: "error",
      file: null,
      progress: 0,
      errorMessage: "形式不正",
    };
    const { wrapper } = await mountPage();
    expect(wrapper.text()).toContain("front.jpg"); // 表面プレビュー継続
    expect(wrapper.text()).toContain("形式不正"); // 裏面エラー表示
  });
});

describe("SignupIdentityPage — 画像プレビュー (URL.createObjectURL)", () => {
  it("ready 状態でプレビュー <img> が表示される", async () => {
    selectedDocumentType.value = "drivers_license";
    frontSlot.value = {
      state: "ready",
      file: new File([new Uint8Array([255, 216])], "front.jpg", {
        type: "image/jpeg",
      }),
      progress: 0,
    };
    const { wrapper } = await mountPage();
    expect(URL.createObjectURL).toHaveBeenCalled();
    const img = wrapper.find('img[alt*="表面"]');
    expect(img.exists()).toBe(true);
    expect(img.attributes("src")).toBe("blob:preview-mock-url");
  });

  it("uploading 状態でも背景にプレビュー画像が表示される", async () => {
    selectedDocumentType.value = "drivers_license";
    frontSlot.value = {
      state: "uploading",
      file: new File([new Uint8Array([255, 216])], "front.jpg", {
        type: "image/jpeg",
      }),
      progress: 50,
    };
    const { wrapper } = await mountPage();
    const img = wrapper.find('img[alt*="アップロード中"]');
    expect(img.exists()).toBe(true);
    expect(img.attributes("src")).toBe("blob:preview-mock-url");
  });

  it("uploaded 状態でプレビュー画像 + ✓ バッジが表示される", async () => {
    selectedDocumentType.value = "drivers_license";
    frontSlot.value = {
      state: "uploaded",
      file: new File([new Uint8Array([255, 216])], "front.jpg", {
        type: "image/jpeg",
      }),
      progress: 100,
    };
    const { wrapper } = await mountPage();
    const img = wrapper.find('img[alt*="表面"]');
    expect(img.exists()).toBe(true);
    expect(wrapper.find('[aria-label="アップロード完了"]').exists()).toBe(true);
  });

  it("empty 状態ではプレビュー <img> が表示されない", async () => {
    selectedDocumentType.value = "drivers_license";
    // frontSlot は default の empty
    const { wrapper } = await mountPage();
    expect(wrapper.find("img").exists()).toBe(false);
  });

  it("ready スロットに削除ボタン (×) が配置される", async () => {
    selectedDocumentType.value = "drivers_license";
    frontSlot.value = {
      state: "ready",
      file: new File([new Uint8Array([255, 216])], "front.jpg", {
        type: "image/jpeg",
      }),
      progress: 0,
    };
    const { wrapper } = await mountPage();
    const btn = wrapper.find('button[aria-label="画像を削除"]');
    expect(btn.exists()).toBe(true);
    await btn.trigger("click");
    expect(removeFileMock).toHaveBeenCalledWith("front");
  });
});
