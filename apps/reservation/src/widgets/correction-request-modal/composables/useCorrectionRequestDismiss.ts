import { ref, watch, type Ref } from "vue";
import type { MemberId } from "@/entities/member";

/**
 * #296 修正依頼モーダルの dismiss 状態を保持するシングルトン composable。
 *
 * - dismiss はモジュールスコープ ref で管理 (アプリ全体で 1 つ)
 * - ページリロード / 再ログイン (auth-callback による navigation) で自然リセット
 *   (ESM モジュールが再評価され dismissed が false に戻る)
 * - SPA 内のページ遷移では state を維持 (dismiss → 他ページ移動 → 戻ってきても消えたまま)
 * - 異なる member.id に切り替わったら明示的に dismissed をリセット
 *   (ログアウト → 別アカウントログインのケース)
 */
const dismissed = ref<boolean>(false);
const lastMemberId = ref<MemberId | null>(null);

export function useCorrectionRequestDismiss(memberIdRef: Ref<MemberId | null>) {
  // member 切替を検知して dismissed をリセット
  watch(
    memberIdRef,
    (next) => {
      if (next === null) return;
      if (lastMemberId.value !== next) {
        dismissed.value = false;
        lastMemberId.value = next;
      }
    },
    { immediate: true },
  );

  function dismiss(): void {
    dismissed.value = true;
  }

  function reset(): void {
    dismissed.value = false;
  }

  return {
    dismissed,
    dismiss,
    reset,
  };
}
