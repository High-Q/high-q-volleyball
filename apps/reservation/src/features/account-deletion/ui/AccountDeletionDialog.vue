<script setup lang="ts">
import { computed } from "vue";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Checkbox,
  Label,
} from "@/shared/ui";
import { Button } from "@high-q/ui";
import {
  useAccountDeletion,
  getDeletionErrorMessage,
} from "../composables/useAccountDeletion";

/**
 * 自己退会の確認 Dialog。同意チェックボックス + danger ボタン。
 *
 * 関連:
 *   openspec/changes/member-withdrawal-flow/specs/reservation-profile-page/spec.md
 */

const props = defineProps<{
  /** 未来予約件数 (0 のときは文言を出さない) */
  upcomingReservationCount: number;
}>();

const deletion = useAccountDeletion();

const errorMessage = computed(() =>
  deletion.deletionError.value
    ? getDeletionErrorMessage(deletion.deletionError.value)
    : null,
);

const consentInputId = "account-deletion-consent";

defineExpose({ open: deletion.open });
</script>

<template>
  <slot name="trigger" :open="deletion.open" />

  <AlertDialog
    :open="deletion.isOpen.value"
    @update:open="
      (next) => {
        if (!next) deletion.cancel();
      }
    "
  >
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>アカウントを削除しますか？</AlertDialogTitle>
        <AlertDialogDescription>
          予約履歴・本人確認書類画像を含む全データが完全に削除されます。元に戻せません。
        </AlertDialogDescription>
      </AlertDialogHeader>

      <p
        v-if="props.upcomingReservationCount > 0"
        class="font-jp text-sm text-ink rounded-hq-sm bg-surface border border-hairline px-hq-3 py-hq-2"
      >
        未来予約 {{ props.upcomingReservationCount }} 件は退会前に自動キャンセルされます。
      </p>

      <div class="flex items-start gap-hq-2">
        <Checkbox
          :id="consentInputId"
          v-model="deletion.consent.value"
          :disabled="deletion.isDeleting.value"
        />
        <Label :html-for="consentInputId" class="font-jp text-sm text-ink">
          上記内容を理解し、削除に同意します。
        </Label>
      </div>

      <p
        v-if="errorMessage"
        role="alert"
        class="font-jp text-sm text-danger bg-danger-soft border border-danger/40 rounded-hq-sm px-hq-3 py-hq-2"
      >
        {{ errorMessage }}
      </p>

      <AlertDialogFooter>
        <Button
          variant="ghost"
          type="button"
          :disabled="deletion.isDeleting.value"
          @click="deletion.cancel"
        >キャンセル</Button>
        <button
          type="button"
          :disabled="!deletion.canConfirm.value"
          class="inline-flex h-10 items-center justify-center rounded-hq-md bg-danger px-hq-4 py-hq-2 text-sm font-jp font-medium text-paper shadow-hq-sm transition-colors hover:bg-danger/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-danger disabled:pointer-events-none disabled:opacity-50"
          @click="deletion.confirm"
        >
          {{ deletion.isDeleting.value ? "削除中…" : "削除する" }}
        </button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
