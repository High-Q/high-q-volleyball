<script setup lang="ts">
import { computed } from "vue";
import { Button } from "@high-q/ui";
import AlertDialog from "@/shared/ui/AlertDialog.vue";
import AlertDialogContent from "@/shared/ui/AlertDialogContent.vue";
import AlertDialogHeader from "@/shared/ui/AlertDialogHeader.vue";
import AlertDialogFooter from "@/shared/ui/AlertDialogFooter.vue";
import AlertDialogTitle from "@/shared/ui/AlertDialogTitle.vue";
import AlertDialogDescription from "@/shared/ui/AlertDialogDescription.vue";
// AlertDialogAction は radix-vue が onClick で自動クローズするため、削除失敗時に
// Dialog 内エラー表示ができない。代わりに plain button + cn() でスタイルだけ
// 揃え、open 状態は useEventDelete に一元管理させる。AlertDialogCancel は
// 「キャンセル＝必ず閉じる」前提なので radix の auto-close で問題ない。
import {
  useEventDelete,
  getDeleteErrorMessage,
} from "../composables/useEventDelete";

/**
 * イベント削除確認 Dialog（AlertDialog）。「キャンセル」「削除する」の 2 段ボタン。
 *
 * 使用例:
 *   <EventDeleteDialog ref="dialogRef" :event-id="eventId" :event-name="event.name">
 *     <template #trigger="{ open }">
 *       <Button variant="danger" @click="open">削除</Button>
 *     </template>
 *   </EventDeleteDialog>
 *
 * 関連:
 *   openspec/changes/admin-events-crud-screen/specs/admin-events-crud/spec.md
 *   openspec/changes/admin-events-crud-screen/design.md (D5)
 */

const props = defineProps<{
  eventId: string;
  eventName?: string;
}>();

const emit = defineEmits<{
  deleted: [];
}>();

const { isOpen, isDeleting, deleteError, open, cancel, confirm } =
  useEventDelete(props.eventId);

const errorMessage = computed(() =>
  deleteError.value ? getDeleteErrorMessage(deleteError.value) : null,
);

async function onConfirm() {
  await confirm();
  if (!deleteError.value) emit("deleted");
}

defineExpose({ open });
</script>

<template>
  <slot name="trigger" :open="open" :is-open="isOpen">
    <Button
      variant="ghost"
      size="sm"
      type="button"
      aria-label="このイベントを削除"
      @click="open"
    >
      削除
    </Button>
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
        <AlertDialogTitle>このイベントを削除しますか？</AlertDialogTitle>
        <AlertDialogDescription>
          <template v-if="eventName">
            「{{ eventName }}」を削除します。LP・予約サイトからも即座に消えます。
          </template>
          <template v-else>
            この操作は取り消せません。LP・予約サイトからも即座に消えます。
          </template>
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
          :disabled="isDeleting"
          class="inline-flex h-9 items-center justify-center rounded-hq-sm border border-hairline bg-paper px-hq-4 py-hq-2 text-sm font-jp font-medium text-ink shadow-hq-sm transition-colors hover:bg-paper-warm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-50 mt-hq-2 sm:mt-0"
          @click="cancel"
        >
          キャンセル
        </button>
        <button
          type="button"
          :disabled="isDeleting"
          class="inline-flex h-9 items-center justify-center rounded-hq-sm bg-danger px-hq-4 py-hq-2 text-sm font-jp font-medium text-paper shadow-hq-sm transition-colors hover:bg-danger/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-50"
          @click="onConfirm"
        >
          {{ isDeleting ? "削除中…" : "削除する" }}
        </button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
