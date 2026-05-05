import { ref, computed, type Ref, type ComputedRef } from "vue";
import type { IdentityDocumentId, MemberId } from "@high-q/shared";
import { useToast } from "@/shared/ui/useToast";
import { usePendingCount } from "@/features/identity-document-pending-badge";
import {
  rejectIdentityDocument,
  type RejectError,
} from "../api/rejectMutation";
import { buildRejectMailtoHref } from "../templates/rejectMailBody";

/**
 * 差し戻し (reject) Dialog の状態管理 + mutation 実行 + mailto: リンク提供 composable。
 *
 * 2 段階フロー (design D8, D9):
 *   - phase='editing': 理由入力 → 「差し戻す」で submit()
 *   - phase='submitting': mutation 進行中
 *   - phase='success': 成功、mailto: リンク + 「閉じる」を表示。closeAfterMail() で
 *     Toast「差し戻しました」+ onSuccess() (一覧へ戻るなど)
 *   - 失敗時は phase='editing' に戻り rejectError を保持
 *
 * 関連:
 *   openspec/changes/admin-identity-document-review/specs/admin-identity-document-review/spec.md
 *     (Requirement: 差し戻しアクション / 再提出依頼メール / 連鎖予約キャンセル)
 *   openspec/changes/admin-identity-document-review/design.md (D8, D9, D11, D12, D23)
 */

const ERROR_MESSAGES: Record<RejectError["code"], string> = {
  NETWORK_ERROR: "通信に失敗しました。再度お試しください。",
  DB_FAILED: "差し戻しに失敗しました。再度お試しください。",
  ALREADY_REVIEWED: "既に他の管理者が処理しました。",
  INVALID_REASON: "理由を 1 〜 500 文字で入力してください。",
  CANCEL_FAILED_AFTER_REJECT:
    "書類は差し戻されましたが、予約のキャンセルに失敗しました。Supabase Dashboard で手動キャンセルしてください。",
};

export function getRejectErrorMessage(error: RejectError): string {
  return ERROR_MESSAGES[error.code] ?? error.message;
}

export const MAX_REASON_LENGTH = 500;

export type RejectPhase = "editing" | "submitting" | "success";

export interface ReviewSuccess {
  memberEmail: string;
  memberName: string;
  cancelledCount: number;
}

export interface UseIdentityDocumentReject {
  isOpen: Ref<boolean>;
  phase: Ref<RejectPhase>;
  reason: Ref<string>;
  rejectError: Ref<RejectError | null>;
  reviewSuccess: Ref<ReviewSuccess | null>;
  reasonLength: ComputedRef<number>;
  isReasonInvalid: ComputedRef<boolean>;
  canSubmit: ComputedRef<boolean>;
  mailtoHref: ComputedRef<string | null>;
  open: () => void;
  cancel: () => void;
  submit: () => Promise<void>;
  closeAfterMail: (onSuccess?: () => void) => void;
}

export function useIdentityDocumentReject(
  documentId: IdentityDocumentId,
  adminMemberId: MemberId,
  memberId: MemberId,
): UseIdentityDocumentReject {
  const { toast } = useToast();
  const { refresh: refreshPendingCount } = usePendingCount();

  const isOpen = ref(false);
  const phase = ref<RejectPhase>("editing");
  const reason = ref("");
  const rejectError = ref<RejectError | null>(null);
  const reviewSuccess = ref<ReviewSuccess | null>(null);

  const reasonLength = computed(() => reason.value.length);
  const isReasonInvalid = computed(
    () =>
      reason.value.trim().length === 0 ||
      reason.value.length > MAX_REASON_LENGTH,
  );
  const canSubmit = computed(
    () => !isReasonInvalid.value && phase.value === "editing",
  );

  const mailtoHref = computed(() => {
    if (!reviewSuccess.value) return null;
    return buildRejectMailtoHref(
      reviewSuccess.value.memberEmail,
      reviewSuccess.value.memberName,
      reason.value,
      reviewSuccess.value.cancelledCount,
    );
  });

  function reset(): void {
    phase.value = "editing";
    reason.value = "";
    rejectError.value = null;
    reviewSuccess.value = null;
  }

  function open(): void {
    reset();
    isOpen.value = true;
  }

  function cancel(): void {
    isOpen.value = false;
    reset();
  }

  async function submit(): Promise<void> {
    if (!canSubmit.value) return;
    rejectError.value = null;
    phase.value = "submitting";
    try {
      const result = await rejectIdentityDocument({
        documentId,
        adminMemberId,
        memberId,
        reason: reason.value,
      });
      if (!result.ok) {
        rejectError.value = result.error;
        phase.value = "editing";
        return;
      }
      reviewSuccess.value = result.value;
      phase.value = "success";
      // 全 consumer (TopNav Badge / Dashboard) を同期
      void refreshPendingCount();
    } catch (e) {
      rejectError.value = {
        code: "NETWORK_ERROR",
        message: e instanceof Error ? e.message : String(e),
      };
      phase.value = "editing";
    }
  }

  function closeAfterMail(onSuccess?: () => void): void {
    const cancelled = reviewSuccess.value?.cancelledCount ?? 0;
    isOpen.value = false;
    reset();
    toast({
      title:
        cancelled > 0
          ? `差し戻しました (予約 ${cancelled} 件もキャンセル)`
          : "差し戻しました",
    });
    onSuccess?.();
  }

  return {
    isOpen,
    phase,
    reason,
    rejectError,
    reviewSuccess,
    reasonLength,
    isReasonInvalid,
    canSubmit,
    mailtoHref,
    open,
    cancel,
    submit,
    closeAfterMail,
  };
}
