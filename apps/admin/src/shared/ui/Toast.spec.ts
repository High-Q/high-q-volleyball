import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { h, defineComponent, nextTick } from "vue";
import Toaster from "./Toaster.vue";
import { useToast } from "./useToast";

const Host = defineComponent({
  components: { Toaster },
  setup() {
    return () => h(Toaster);
  },
});

describe("ToastViewport class — mobile/desktop ともに bottom 配置", () => {
  it("ToastViewport は mobile で bottom-0/left-0/right-0、sm 以上で sm:left-auto/sm:right-0 のクラスを持つ (ヘッダー被害回避 + Toast 下スライドインとの整合)", async () => {
    const { toast, dismiss } = useToast();
    dismiss();
    mount(Host, { attachTo: document.body });
    toast({ title: "x", duration: 0 });
    await nextTick();
    await new Promise((r) => setTimeout(r, 0));
    const vp = document.querySelector('[role="region"][aria-label="通知"]');
    expect(vp).not.toBeNull();
    const cls = (vp as HTMLElement).className;
    // Mobile (< sm): 画面下部全幅
    expect(cls).toMatch(/\bbottom-0\b/);
    expect(cls).toMatch(/\bleft-0\b/);
    expect(cls).toMatch(/\bright-0\b/);
    // Desktop (sm+): 右下、最大幅 420px
    expect(cls).toMatch(/sm:left-auto/);
    expect(cls).toMatch(/sm:right-0/);
    expect(cls).toMatch(/md:max-w-\[420px\]/);
    // top-0 が **付いていない** こと（ヘッダー被害回避）
    expect(cls).not.toMatch(/\btop-0\b/);
    // iOS home indicator / URL bar 配慮の safe-area-inset-bottom padding
    expect(cls).toMatch(/pb-\[max\(env\(safe-area-inset-bottom\),1rem\)\]/);
  });
});

describe("Toast / useToast / Toaster", () => {
  it("toast() を発行すると Toaster に title が現れる", async () => {
    const { toast, dismiss } = useToast();
    dismiss(); // 既存をクリア
    mount(Host, { attachTo: document.body });
    toast({ title: "保存しました", duration: 0 });
    await nextTick();
    await new Promise((r) => setTimeout(r, 0));
    expect(document.body.textContent).toContain("保存しました");
  });

  it("variant='destructive' で role='alert' が付与される", async () => {
    const { toast, dismiss } = useToast();
    dismiss();
    mount(Host, { attachTo: document.body });
    toast({
      title: "保存に失敗しました",
      variant: "destructive",
      duration: 0,
    });
    await nextTick();
    await new Promise((r) => setTimeout(r, 0));
    const alert = document.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain("保存に失敗しました");
  });

  it("dismiss() で toast が閉じる", async () => {
    const { toast, dismiss } = useToast();
    dismiss();
    mount(Host, { attachTo: document.body });
    const { id } = toast({ title: "一時的", duration: 0 });
    await nextTick();
    dismiss(id);
    // 閉じアニメーション完了まで scheduleRemove(200) 待機
    await new Promise((r) => setTimeout(r, 250));
    expect(document.body.textContent).not.toContain("一時的");
  });
});
