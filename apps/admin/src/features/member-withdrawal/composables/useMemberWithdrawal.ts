import { computed, ref, type ComputedRef, type Ref } from "vue";
import type { MemberId } from "@high-q/shared";
import { getSupabase } from "@/shared/api/supabase";
import { useToast } from "@/shared/ui/useToast";

/**
 * admin による会員強制削除 composable。
 *
 * フロー: open() → AlertDialog 表示 → 対象会員のメール再入力一致確認
 *        → confirm() で withdraw-member Edge Function 呼び出し
 *        → 成功は Toast + sheet 閉鎖 + 一覧 patch、失敗は inline error 保持
 *
 * 関連:
 *   openspec/changes/member-withdrawal-flow/specs/admin-members-list/spec.md
 *   openspec/changes/member-withdrawal-flow/design.md (D3, D6)
 */

export type WithdrawError =
  | "NETWORK_ERROR"
  | "FORBIDDEN"
  | "INTERNAL"
  | "AUTH_DELETE_FAILED";

export interface UseMemberWithdrawalOptions {
  memberId: MemberId;
  targetEmail: string;
  onSuccess?: () => void;
}

export interface UseMemberWithdrawal {
  isOpen: Ref<boolean>;
  isWithdrawing: Ref<boolean>;
  withdrawError: Ref<WithdrawError | null>;
  emailInput: Ref<string>;
  isEmailMatched: ComputedRef<boolean>;
  open: () => void;
  cancel: () => void;
  confirm: () => Promise<void>;
}

const ERROR_MESSAGES: Record<WithdrawError, string> = {
  NETWORK_ERROR: "通信に失敗しました。再度お試しください。",
  FORBIDDEN: "削除権限がありません。",
  INTERNAL: "削除に失敗しました。時間をおいて再試行してください。",
  AUTH_DELETE_FAILED:
    "DB の削除は完了しましたが、認証アカウントの削除に失敗しました。運営に通知してください。",
};

export function getWithdrawErrorMessage(error: WithdrawError): string {
  return ERROR_MESSAGES[error];
}

export function useMemberWithdrawal(
  options: UseMemberWithdrawalOptions,
): UseMemberWithdrawal {
  const { toast } = useToast();
  const isOpen = ref<boolean>(false);
  const isWithdrawing = ref<boolean>(false);
  const withdrawError = ref<WithdrawError | null>(null);
  const emailInput = ref<string>("");

  const isEmailMatched = computed<boolean>(
    () => emailInput.value.trim() === options.targetEmail,
  );

  function open(): void {
    withdrawError.value = null;
    emailInput.value = "";
    isOpen.value = true;
  }

  function cancel(): void {
    isOpen.value = false;
  }

  async function confirm(): Promise<void> {
    if (!isEmailMatched.value || isWithdrawing.value) return;
    withdrawError.value = null;
    isWithdrawing.value = true;
    try {
      const supabase = getSupabase();
      const { error } = await supabase.functions.invoke("withdraw-member", {
        body: { target_member_id: options.memberId },
      });
      if (error) {
        // Edge Function の HTTP status から分岐
        const ctx = error.context as { status?: number } | undefined;
        const status = ctx?.status;
        if (status === 403 || status === 401) {
          withdrawError.value = "FORBIDDEN";
        } else if (status === undefined) {
          withdrawError.value = "NETWORK_ERROR";
        } else {
          withdrawError.value = "INTERNAL";
        }
        return;
      }
      isOpen.value = false;
      toast({ title: "会員を削除しました" });
      options.onSuccess?.();
    } catch {
      withdrawError.value = "NETWORK_ERROR";
    } finally {
      isWithdrawing.value = false;
    }
  }

  return {
    isOpen,
    isWithdrawing,
    withdrawError,
    emailInput,
    isEmailMatched,
    open,
    cancel,
    confirm,
  };
}
