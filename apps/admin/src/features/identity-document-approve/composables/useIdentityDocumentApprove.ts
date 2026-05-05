import { ref, type Ref } from "vue";
import type { IdentityDocumentId, MemberId } from "@high-q/shared";
import { useToast } from "@/shared/ui/useToast";
import { usePendingCount } from "@/features/identity-document-pending-badge";
import { approveIdentityDocument, type ApproveError } from "../api/approveMutation";

/**
 * 承認 (approve) Dialog の状態管理 + mutation 実行 composable。
 *
 * フロー:
 *   open() → AlertDialog 表示 → confirm() で mutation
 *   成功時: pendingCount.refresh() + Toast「承認しました」+ onSuccess()
 *   失敗時: approveError を Dialog 内 inline error として保持 (再試行可能)
 *
 * 関連:
 *   openspec/changes/admin-identity-document-review/specs/admin-identity-document-review/spec.md
 *     (Requirement: 承認アクション)
 *   openspec/changes/admin-identity-document-review/design.md (D7, D11, D12)
 */

const ERROR_MESSAGES: Record<ApproveError["code"], string> = {
  NETWORK_ERROR: "通信に失敗しました。再度お試しください。",
  DB_FAILED: "承認に失敗しました。再度お試しください。",
  ALREADY_REVIEWED: "既に他の管理者が処理しました。",
};

export function getApproveErrorMessage(error: ApproveError): string {
  return ERROR_MESSAGES[error.code] ?? error.message;
}

export interface UseIdentityDocumentApprove {
  isOpen: Ref<boolean>;
  isApproving: Ref<boolean>;
  approveError: Ref<ApproveError | null>;
  open: () => void;
  cancel: () => void;
  confirm: (onSuccess?: () => void) => Promise<void>;
}

export function useIdentityDocumentApprove(
  documentId: IdentityDocumentId,
  adminMemberId: MemberId,
): UseIdentityDocumentApprove {
  const { toast } = useToast();
  const { refresh: refreshPendingCount } = usePendingCount();

  const isOpen = ref(false);
  const isApproving = ref(false);
  const approveError = ref<ApproveError | null>(null);

  function open(): void {
    approveError.value = null;
    isOpen.value = true;
  }

  function cancel(): void {
    isOpen.value = false;
  }

  async function confirm(onSuccess?: () => void): Promise<void> {
    approveError.value = null;
    isApproving.value = true;
    try {
      const result = await approveIdentityDocument(documentId, adminMemberId);
      if (!result.ok) {
        approveError.value = result.error;
        return;
      }
      isOpen.value = false;
      // 全 consumer (TopNav Badge / Dashboard) を同期
      void refreshPendingCount();
      toast({ title: "承認しました" });
      onSuccess?.();
    } finally {
      isApproving.value = false;
    }
  }

  return { isOpen, isApproving, approveError, open, cancel, confirm };
}
