<script setup lang="ts">
import { computed } from "vue";
import type { ReservationId } from "@high-q/shared";
import AlertDialog from "@/shared/ui/AlertDialog.vue";
import AlertDialogContent from "@/shared/ui/AlertDialogContent.vue";
import AlertDialogHeader from "@/shared/ui/AlertDialogHeader.vue";
import AlertDialogFooter from "@/shared/ui/AlertDialogFooter.vue";
import AlertDialogTitle from "@/shared/ui/AlertDialogTitle.vue";
import AlertDialogDescription from "@/shared/ui/AlertDialogDescription.vue";
import {
  useReservationCancelByAdmin,
  getCancelErrorMessage,
} from "../composables/useReservationCancelByAdmin";

/**
 * 予約キャンセル代行 Dialog（AlertDialog）。「キャンセル」「予約を取消」の 2 段ボタン。
 *
 * 関連:
 *   openspec/changes/admin-event-detail-screen/specs/admin-event-detail/spec.md
 *   openspec/changes/admin-event-detail-screen/design.md (D4)
 */

const props = defineProps<{
  reservationId: ReservationId;
  memberName: string;
}>();

const emit = defineEmits<{
  cancelled: [];
}>();

const { isOpen, isCancelling, cancelError, open, cancel, confirm } =
  useReservationCancelByAdmin(props.reservationId);

const errorMessage = computed(() =>
  cancelError.value ? getCancelErrorMessage(cancelError.value) : null,
);

async function onConfirm() {
  await confirm(() => emit("cancelled"));
}

defineExpose({ open });
</script>

<template>
  <slot name="trigger" :open="open" :is-open="isOpen">
    <button
      type="button"
      class="inline-flex h-7 items-center justify-center rounded-hq-sm border border-hairline bg-paper px-hq-2 text-xs font-jp text-muted hover:text-danger hover:border-danger focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
      :aria-label="`${memberName} の予約をキャンセル`"
      @click="open"
    >
      キャンセル代行
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
        <AlertDialogTitle>予約をキャンセルしますか？</AlertDialogTitle>
        <AlertDialogDescription>
          {{ memberName }} さんの予約をキャンセルします。この操作は元に戻せません。
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
          :disabled="isCancelling"
          class="inline-flex h-9 items-center justify-center rounded-hq-sm border border-hairline bg-paper px-hq-4 py-hq-2 text-sm font-jp font-medium text-ink shadow-hq-sm transition-colors hover:bg-paper-warm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-50 mt-hq-2 sm:mt-0"
          @click="cancel"
        >
          キャンセル
        </button>
        <button
          type="button"
          :disabled="isCancelling"
          class="inline-flex h-9 items-center justify-center rounded-hq-sm bg-danger px-hq-4 py-hq-2 text-sm font-jp font-medium text-paper shadow-hq-sm transition-colors hover:bg-danger/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-50"
          @click="onConfirm"
        >
          {{ isCancelling ? "処理中…" : "予約を取消" }}
        </button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
