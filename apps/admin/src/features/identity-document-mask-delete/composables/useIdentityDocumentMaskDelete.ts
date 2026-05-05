import { ref, computed, type Ref, type ComputedRef } from "vue";
import type { IdentityDocumentId, MemberId } from "@high-q/shared";
import { useToast } from "@/shared/ui/useToast";
import { usePendingCount } from "@/features/identity-document-pending-badge";
import {
  maskDeleteIdentityDocument,
  type MaskDeleteError,
} from "../api/maskDeleteMutation";
import { buildMaskDeleteMailtoHref } from "../templates/maskDeleteMailBody";

/**
 * マスク漏れ即時削除 (mask-delete) Dialog の状態管理 + mutation 実行 + mailto: composable。
 *
 * 関連:
 *   openspec/changes/admin-identity-document-review/specs/admin-identity-document-review/spec.md
 *     (Requirement: マスク漏れ即時削除アクション / 連鎖予約キャンセル)
 *   openspec/changes/admin-identity-document-review/design.md (D10, D11, D23)
 */

const ERROR_MESSAGES: Record<MaskDeleteError["code"], string> = {
  NETWORK_ERROR: "通信に失敗しました。再度お試しください。",
  STORAGE_FAILED: "Storage 削除に失敗しました。再試行してください。",
  DB_FAILED_AFTER_STORAGE_DELETE:
    "DB 更新に失敗しました。Storage は削除済みです。Supabase Dashboard から手動で DB を更新してください。",
  ALREADY_REVIEWED: "既に他の管理者が処理しました。",
  CANCEL_FAILED_AFTER_MASK_DELETE:
    "Storage 削除と DB 更新は完了しましたが、予約のキャンセルに失敗しました。Supabase Dashboard で手動キャンセルしてください。",
};

export function getMaskDeleteErrorMessage(error: MaskDeleteError): string {
  return ERROR_MESSAGES[error.code] ?? error.message;
}

export type MaskDeletePhase = "editing" | "submitting" | "success";

export interface ReviewSuccess {
  memberEmail: string;
  memberName: string;
  cancelledCount: number;
}

export interface UseIdentityDocumentMaskDelete {
  isOpen: Ref<boolean>;
  phase: Ref<MaskDeletePhase>;
  maskDeleteError: Ref<MaskDeleteError | null>;
  reviewSuccess: Ref<ReviewSuccess | null>;
  mailtoHref: ComputedRef<string | null>;
  open: () => void;
  cancel: () => void;
  submit: () => Promise<void>;
  closeAfterMail: (onSuccess?: () => void) => void;
}

export function useIdentityDocumentMaskDelete(
  documentId: IdentityDocumentId,
  adminMemberId: MemberId,
  memberId: MemberId,
  storagePaths: { front: string | null; back: string | null },
): UseIdentityDocumentMaskDelete {
  const { toast } = useToast();
  const { refresh: refreshPendingCount } = usePendingCount();

  const isOpen = ref(false);
  const phase = ref<MaskDeletePhase>("editing");
  const maskDeleteError = ref<MaskDeleteError | null>(null);
  const reviewSuccess = ref<ReviewSuccess | null>(null);

  const mailtoHref = computed(() => {
    if (!reviewSuccess.value) return null;
    return buildMaskDeleteMailtoHref(
      reviewSuccess.value.memberEmail,
      reviewSuccess.value.memberName,
      reviewSuccess.value.cancelledCount,
    );
  });

  function reset(): void {
    phase.value = "editing";
    maskDeleteError.value = null;
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
    if (phase.value !== "editing") return;
    maskDeleteError.value = null;
    phase.value = "submitting";
    try {
      const result = await maskDeleteIdentityDocument({
        documentId,
        adminMemberId,
        memberId,
        storagePaths,
      });
      if (!result.ok) {
        maskDeleteError.value = result.error;
        phase.value = "editing";
        return;
      }
      reviewSuccess.value = result.value;
      phase.value = "success";
      void refreshPendingCount();
    } catch (e) {
      maskDeleteError.value = {
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
          ? `削除しました (予約 ${cancelled} 件もキャンセル)`
          : "削除しました",
    });
    onSuccess?.();
  }

  return {
    isOpen,
    phase,
    maskDeleteError,
    reviewSuccess,
    mailtoHref,
    open,
    cancel,
    submit,
    closeAfterMail,
  };
}
