<script setup lang="ts">
import { computed } from "vue";
import type { IdentityDocumentId, MemberId } from "@high-q/shared";
import AlertDialog from "@/shared/ui/AlertDialog.vue";
import AlertDialogContent from "@/shared/ui/AlertDialogContent.vue";
import AlertDialogHeader from "@/shared/ui/AlertDialogHeader.vue";
import AlertDialogFooter from "@/shared/ui/AlertDialogFooter.vue";
import AlertDialogTitle from "@/shared/ui/AlertDialogTitle.vue";
import AlertDialogDescription from "@/shared/ui/AlertDialogDescription.vue";
import {
  useIdentityDocumentApprove,
  getApproveErrorMessage,
} from "../composables/useIdentityDocumentApprove";

/**
 * 承認 AlertDialog (#171 admin-identity-document-review)。
 *
 * 関連:
 *   openspec/changes/admin-identity-document-review/specs/admin-identity-document-review/spec.md
 *     (Requirement: 承認アクション)
 *   openspec/changes/admin-identity-document-review/design.md (D7)
 */

const props = defineProps<{
  documentId: IdentityDocumentId;
  adminMemberId: MemberId;
  memberName: string;
  documentTypeLabel: string;
  /** すでに pending 以外の場合は trigger ボタンを disabled にする (二重承認防御) */
  disabled?: boolean;
}>();

const emit = defineEmits<{
  approved: [];
}>();

const { isOpen, isApproving, approveError, open, cancel, confirm } =
  useIdentityDocumentApprove(props.documentId, props.adminMemberId);

const errorMessage = computed(() =>
  approveError.value ? getApproveErrorMessage(approveError.value) : null,
);

async function onConfirm() {
  await confirm(() => emit("approved"));
}

defineExpose({ open });
</script>

<template>
  <slot name="trigger" :open="open" :is-open="isOpen" :disabled="disabled">
    <button
      type="button"
      :disabled="disabled"
      :aria-disabled="disabled"
      :aria-label="`${memberName} の本人確認書類を承認`"
      class="inline-flex h-9 items-center justify-center rounded-hq-sm bg-success px-hq-4 py-hq-2 text-sm font-jp font-medium text-paper shadow-hq-sm transition-colors hover:bg-success/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-50"
      @click="open"
    >
      承認
    </button>
  </slot>

  <AlertDialog
    :open="isOpen"
    @update:open="
      (next) => {
        if (!next) cancel();
      }
    "
  >
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>この書類を承認しますか?</AlertDialogTitle>
        <AlertDialogDescription>
          {{ memberName }} さんの {{ documentTypeLabel }} を承認します。
          承認後はユーザーが予約できる状態になります。
        </AlertDialogDescription>
      </AlertDialogHeader>

      <p
        v-if="errorMessage"
        role="alert"
        class="font-jp text-sm text-danger bg-danger-soft border border-danger/40 rounded-hq-sm px-hq-3 py-hq-2"
      >
        {{ errorMessage }}
      </p>

      <AlertDialogFooter>
        <button
          type="button"
          :disabled="isApproving"
          class="inline-flex h-9 items-center justify-center rounded-hq-sm border border-hairline bg-paper px-hq-4 py-hq-2 text-sm font-jp font-medium text-ink shadow-hq-sm transition-colors hover:bg-paper-warm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-50 mt-hq-2 sm:mt-0"
          @click="cancel"
        >
          キャンセル
        </button>
        <button
          type="button"
          :disabled="isApproving"
          :aria-busy="isApproving"
          class="inline-flex h-9 items-center justify-center rounded-hq-sm bg-success px-hq-4 py-hq-2 text-sm font-jp font-medium text-paper shadow-hq-sm transition-colors hover:bg-success/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-50"
          @click="onConfirm"
        >
          {{ isApproving ? "処理中…" : "承認する" }}
        </button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
