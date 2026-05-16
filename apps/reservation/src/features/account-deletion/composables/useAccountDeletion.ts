import { computed, ref, type ComputedRef, type Ref } from "vue";
import { getSupabase } from "@/shared/api/supabase";
import { useAuthSession } from "@/features/auth";
import { LP_TOP_URL } from "@/shared/lib/externalLinks";

/**
 * 会員自己退会 composable。
 *
 * フロー:
 *   1. 同意チェックボックス ON で confirm を有効化
 *   2. confirm() で withdraw-member Edge Function 呼び出し (target_member_id = 自分)
 *   3. 成功 → supabase.auth.signOut() → LP トップに ?withdrawn=1 付きで遷移
 *   4. 失敗 → inline error 保持、セッション維持
 *
 * 関連:
 *   openspec/changes/member-withdrawal-flow/specs/reservation-profile-page/spec.md
 *   openspec/changes/member-withdrawal-flow/design.md (D3, D6, D7)
 */

export type DeletionError =
  | "NETWORK_ERROR"
  | "FORBIDDEN"
  | "INTERNAL"
  | "AUTH_DELETE_FAILED";

const ERROR_MESSAGES: Record<DeletionError, string> = {
  NETWORK_ERROR: "通信に失敗しました。再度お試しください。",
  FORBIDDEN: "削除権限がありません。",
  INTERNAL: "削除に失敗しました。時間をおいて再試行してください。",
  AUTH_DELETE_FAILED:
    "削除は完了しましたが、ログアウト処理に失敗しました。ブラウザを閉じてください。",
};

export function getDeletionErrorMessage(error: DeletionError): string {
  return ERROR_MESSAGES[error];
}

export interface UseAccountDeletion {
  isOpen: Ref<boolean>;
  isDeleting: Ref<boolean>;
  deletionError: Ref<DeletionError | null>;
  consent: Ref<boolean>;
  canConfirm: ComputedRef<boolean>;
  open: () => void;
  cancel: () => void;
  confirm: () => Promise<void>;
}

export function useAccountDeletion(): UseAccountDeletion {
  const session = useAuthSession();
  const isOpen = ref<boolean>(false);
  const isDeleting = ref<boolean>(false);
  const deletionError = ref<DeletionError | null>(null);
  const consent = ref<boolean>(false);

  const canConfirm = computed<boolean>(
    () => consent.value && !isDeleting.value,
  );

  function open(): void {
    deletionError.value = null;
    consent.value = false;
    isOpen.value = true;
  }

  function cancel(): void {
    isOpen.value = false;
  }

  async function confirm(): Promise<void> {
    if (!canConfirm.value) return;
    const memberId = session.member.value?.id;
    if (!memberId) {
      deletionError.value = "FORBIDDEN";
      return;
    }
    deletionError.value = null;
    isDeleting.value = true;
    try {
      const supabase = getSupabase();
      const { error } = await supabase.functions.invoke("withdraw-member", {
        body: { target_member_id: memberId },
      });
      if (error) {
        const ctx = error.context as { status?: number } | undefined;
        const status = ctx?.status;
        if (status === 403 || status === 401) {
          deletionError.value = "FORBIDDEN";
        } else if (status === undefined) {
          deletionError.value = "NETWORK_ERROR";
        } else {
          deletionError.value = "INTERNAL";
        }
        return;
      }
      // 成功: signOut → LP リダイレクト
      try {
        await supabase.auth.signOut();
      } catch {
        deletionError.value = "AUTH_DELETE_FAILED";
        // signOut 失敗でも先に進む(削除自体は完了している)
      }
      window.location.href = `${LP_TOP_URL}/?withdrawn=1`;
    } catch {
      deletionError.value = "NETWORK_ERROR";
    } finally {
      isDeleting.value = false;
    }
  }

  return {
    isOpen,
    isDeleting,
    deletionError,
    consent,
    canConfirm,
    open,
    cancel,
    confirm,
  };
}
