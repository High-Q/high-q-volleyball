import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ref, nextTick } from "vue";
import type { MemberId } from "@/entities/member";

const MEMBER_A = "00000000-0000-0000-0000-00000000000a" as unknown as MemberId;
const MEMBER_B = "00000000-0000-0000-0000-00000000000b" as unknown as MemberId;

/**
 * 同 module の dismissed state は singleton。各テストで beforeEach で再 import
 * してモジュールを fresh に評価する（vi.resetModules + dynamic import）。
 */
beforeEach(async () => {
  const vitest = await import("vitest");
  vitest.vi.resetModules();
});

afterEach(() => {});

describe("useCorrectionRequestDismiss", () => {
  it("初期状態は dismissed=false", async () => {
    const { useCorrectionRequestDismiss } = await import(
      "./useCorrectionRequestDismiss"
    );
    const memberIdRef = ref<MemberId | null>(MEMBER_A);
    const { dismissed } = useCorrectionRequestDismiss(memberIdRef);
    expect(dismissed.value).toBe(false);
  });

  it("dismiss() で dismissed=true", async () => {
    const { useCorrectionRequestDismiss } = await import(
      "./useCorrectionRequestDismiss"
    );
    const memberIdRef = ref<MemberId | null>(MEMBER_A);
    const { dismissed, dismiss } = useCorrectionRequestDismiss(memberIdRef);
    dismiss();
    expect(dismissed.value).toBe(true);
  });

  it("同一 member 内では dismissed が維持される (SPA 内ページ遷移想定)", async () => {
    const { useCorrectionRequestDismiss } = await import(
      "./useCorrectionRequestDismiss"
    );
    const memberIdRef = ref<MemberId | null>(MEMBER_A);
    const first = useCorrectionRequestDismiss(memberIdRef);
    first.dismiss();
    // 別ページで再度 composable を呼ぶ想定 → 同じ singleton state を共有
    const second = useCorrectionRequestDismiss(memberIdRef);
    expect(second.dismissed.value).toBe(true);
  });

  it("異なる member.id に切り替わると dismissed リセット (ログアウト→別アカウントログイン)", async () => {
    const { useCorrectionRequestDismiss } = await import(
      "./useCorrectionRequestDismiss"
    );
    const memberIdRef = ref<MemberId | null>(MEMBER_A);
    const { dismissed, dismiss } = useCorrectionRequestDismiss(memberIdRef);
    dismiss();
    expect(dismissed.value).toBe(true);
    memberIdRef.value = MEMBER_B;
    await nextTick();
    expect(dismissed.value).toBe(false);
  });

  it("member が null になっても dismissed は変化しない（ログアウト時）", async () => {
    const { useCorrectionRequestDismiss } = await import(
      "./useCorrectionRequestDismiss"
    );
    const memberIdRef = ref<MemberId | null>(MEMBER_A);
    const { dismissed, dismiss } = useCorrectionRequestDismiss(memberIdRef);
    dismiss();
    memberIdRef.value = null;
    await nextTick();
    expect(dismissed.value).toBe(true); // null は無視
  });

  it("reset() で明示的に dismissed=false に戻せる", async () => {
    const { useCorrectionRequestDismiss } = await import(
      "./useCorrectionRequestDismiss"
    );
    const memberIdRef = ref<MemberId | null>(MEMBER_A);
    const { dismissed, dismiss, reset } = useCorrectionRequestDismiss(memberIdRef);
    dismiss();
    expect(dismissed.value).toBe(true);
    reset();
    expect(dismissed.value).toBe(false);
  });
});
