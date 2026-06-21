<script setup lang="ts">
import { computed } from "vue";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui";
import { isCancellable } from "../composables/useCancelBooking";
import {
  HIGH_Q_OPEN_CHAT_NAME,
  HIGH_Q_OPEN_CHAT_URL,
} from "@/shared/lib/contact-channels";

/**
 * 予約キャンセルの確認ダイアログ。
 *
 * - キャンセル可否は `events.start_at` と現在時刻の比較で判定
 *   (events.cancel_deadline は MVP1 では参照しない)
 * - 開催開始以降は内容を「不可案内」に切替え、Action ボタンを描画しない
 * - submitting は呼び出し側 (useCancelBooking) から渡す
 *
 * 関連:
 *   openspec/changes/reservation-booking-flow/specs/reservation-booking-flow/spec.md
 */

const props = withDefaults(
  defineProps<{
    open: boolean;
    /** 対象イベントの開催開始時刻 (ISO 8601) */
    eventStartAt: string;
    submitting?: boolean;
    errorMessage?: string;
    /**
     * 'reservation' (既定): 通常予約のキャンセル。開催前日中までの日付ゲートを適用。
     * 'waitlist': キャンセル待ちの取り消し。意思表明の撤回なので日付ゲートなし (常に可)。
     */
    kind?: "reservation" | "waitlist";
  }>(),
  { kind: "reservation" },
);

const emit = defineEmits<{
  (e: "update:open", value: boolean): void;
  (e: "confirm"): void;
}>();

const isWaitlist = computed(() => props.kind === "waitlist");
const cancellable = computed(() =>
  isWaitlist.value ? true : isCancellable(props.eventStartAt),
);

function onUpdateOpen(value: boolean): void {
  emit("update:open", value);
}

function onConfirm(): void {
  emit("confirm");
}
</script>

<template>
  <AlertDialog :open="props.open" @update:open="onUpdateOpen">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>
          <template v-if="isWaitlist">キャンセル待ちを取り消しますか？</template>
          <template v-else-if="cancellable">予約をキャンセルしますか？</template>
          <template v-else>キャンセル期限を過ぎています</template>
        </AlertDialogTitle>
        <AlertDialogDescription>
          <template v-if="isWaitlist">
            取り消すと繰り上げの対象から外れます。再度キャンセル待ちに登録し直すこともできます。
          </template>
          <template v-else-if="cancellable">
            キャンセル後、同じイベントへ再度予約することができます。
          </template>
          <template v-else>
            キャンセル期限 (開催前日中) を過ぎているためキャンセルできません。やむを得ない事情がある場合は、LINE オープンチャット
            <a
              :href="HIGH_Q_OPEN_CHAT_URL"
              target="_blank"
              rel="noopener noreferrer"
              class="text-accent underline underline-offset-2"
            >「{{ HIGH_Q_OPEN_CHAT_NAME }}」</a>
            までご連絡ください。
          </template>
        </AlertDialogDescription>
      </AlertDialogHeader>

      <p
        v-if="props.errorMessage"
        class="font-jp text-xs text-danger m-0"
        role="alert"
      >
        {{ props.errorMessage }}
      </p>

      <AlertDialogFooter>
        <AlertDialogCancel :disabled="props.submitting">
          {{ cancellable ? "戻る" : "閉じる" }}
        </AlertDialogCancel>
        <AlertDialogAction
          v-if="cancellable"
          :disabled="props.submitting"
          data-testid="confirm-cancel"
          @click="onConfirm"
        >
          {{
            props.submitting
              ? "処理中..."
              : isWaitlist
                ? "取り消す"
                : "キャンセルする"
          }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
