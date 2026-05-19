<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { Button } from "@high-q/ui";
import AlertDialog from "@/shared/ui/AlertDialog.vue";
import AlertDialogContent from "@/shared/ui/AlertDialogContent.vue";
import AlertDialogHeader from "@/shared/ui/AlertDialogHeader.vue";
import AlertDialogFooter from "@/shared/ui/AlertDialogFooter.vue";
import AlertDialogTitle from "@/shared/ui/AlertDialogTitle.vue";
import AlertDialogDescription from "@/shared/ui/AlertDialogDescription.vue";
import Textarea from "@/shared/ui/Textarea.vue";
// AlertDialogAction は radix-vue が onClick で自動クローズするため、削除失敗時に
// Dialog 内エラー表示ができない。代わりに plain button + cn() でスタイルだけ
// 揃え、open 状態は useEventDelete に一元管理させる。
import {
  useEventDelete,
  getDeleteErrorMessage,
  activeCount,
  historyCount,
  formatStartAtJst,
} from "../composables/useEventDelete";
import {
  renderEventCancellationMail,
  type EventCancellationMailInput,
} from "@high-q/shared/mail-templates";

const ORGANIZER_MESSAGE_MAX = 500;

// EventDeleteDialog プレビューでも Edge Function と同じ定数を使う MUST。
// `supabase/functions/send-event-cancellation-notification/index.ts` と完全同期。
const LINE_OPEN_CHAT_URL =
  "https://line.me/ti/g2/f6YscOz1mh7dnUWX_T4fG3mlqzppz7EoC6-k9A?utm_source=invitation&utm_medium=link_copy&utm_campaign=default";
const PREVIEW_SUPPORT_NOTE =
  "メールが届かない場合は迷惑メールフォルダもご確認ください。";
const PREVIEW_RESERVATION_BASE_URL = "https://high-q-reservation.onrender.com";

/**
 * イベント削除確認 Dialog（AlertDialog）。
 *
 * #253 の方針:
 *   - 有効予約があっても主催者の判断で削除可（FK CASCADE）
 *   - 予約内訳を事前表示し、誤操作を防ぐ
 *   - 有効予約がある場合は「予約者には別途ご連絡ください」を明示
 *
 * 関連:
 *   openspec/changes/fix-admin-event-delete-cancelled-reservations/specs/admin-events-crud/spec.md
 */

const props = defineProps<{
  eventId: string;
  eventName?: string;
}>();

const emit = defineEmits<{
  deleted: [];
}>();

const {
  isOpen,
  isDeleting,
  breakdown,
  isLoadingBreakdown,
  breakdownError,
  deleteError,
  canConfirm,
  meta,
  open,
  cancel,
  confirm,
} = useEventDelete(props.eventId);

const deleteErrorMessage = computed(() =>
  deleteError.value ? getDeleteErrorMessage(deleteError.value) : null,
);
const breakdownErrorMessage = computed(() =>
  breakdownError.value ? getDeleteErrorMessage(breakdownError.value) : null,
);

const active = computed(() => (breakdown.value ? activeCount(breakdown.value) : 0));
const history = computed(() => (breakdown.value ? historyCount(breakdown.value) : 0));

const organizerMessage = ref<string>("");
const organizerMessageId = `event-delete-organizer-msg-${props.eventId}`;
const organizerMessageCounterId = `${organizerMessageId}-count`;
const remainingChars = computed(
  () => ORGANIZER_MESSAGE_MAX - organizerMessage.value.length,
);

// Dialog を閉じたとき (cancel / ESC / 削除成功) は次回開閉のために textarea を破棄。
watch(isOpen, (next) => {
  if (!next) organizerMessage.value = "";
});

// 削除確定前のメール本文プレビュー。Edge Function 側と同一の renderer を共有する。
// meta が取得できていない場合 (event 削除済 / RLS) はプレビューを描画しない。
const mailPreview = computed<{ subject: string; body: string } | null>(() => {
  if (!meta.value) return null;
  const trimmedMessage = organizerMessage.value.trim();
  const input: EventCancellationMailInput = {
    eventName: meta.value.eventName,
    startAtJst: formatStartAtJst(meta.value.startAtIso),
    venueName: meta.value.venueName,
    lineOpenChatUrl: LINE_OPEN_CHAT_URL,
    reservationBaseUrl: PREVIEW_RESERVATION_BASE_URL,
    supportNote: PREVIEW_SUPPORT_NOTE,
    ...(trimmedMessage.length > 0
      ? { organizerMessage: trimmedMessage }
      : {}),
  };
  return renderEventCancellationMail(input);
});

async function onConfirm() {
  await confirm(organizerMessage.value);
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

      <!-- 予約内訳セクション -->
      <div class="font-jp text-sm" aria-live="polite">
        <!-- Loading -->
        <p
          v-if="isLoadingBreakdown"
          data-testid="breakdown-loading"
          class="text-ink-muted"
        >
          予約内訳を確認中…
        </p>

        <!-- Error -->
        <p
          v-else-if="breakdownErrorMessage"
          role="alert"
          class="text-danger bg-danger-soft border border-danger/40 rounded-hq-sm px-hq-3 py-hq-2"
          data-testid="breakdown-error"
        >
          予約内訳を取得できませんでした: {{ breakdownErrorMessage }}
        </p>

        <!-- 予約 0 件 -->
        <p
          v-else-if="breakdown && active === 0 && history === 0"
          class="text-ink-muted"
          data-testid="breakdown-empty"
        >
          このイベントに予約はありません。
        </p>

        <!-- 予約あり -->
        <div
          v-else-if="breakdown"
          class="rounded-hq-sm border border-hairline bg-paper-warm px-hq-3 py-hq-2 space-y-hq-1"
          data-testid="breakdown-summary"
        >
          <p v-if="active > 0">
            <strong>{{ active }} 件</strong> の有効予約（受付中・参加済）が削除されます。
          </p>
          <p v-if="history > 0" class="text-ink-muted">
            キャンセル済 / no-show / キャンセル待ち {{ history }} 件の履歴も整理されます。
          </p>
          <p
            v-if="active > 0"
            class="pt-hq-1 text-ink-muted"
            data-testid="breakdown-warn-active"
          >
            対象の予約者にはキャンセル通知メールを自動で送信します。
          </p>
        </div>
      </div>

      <!-- 主催者メッセージ (optional) -->
      <div v-if="active > 0 && !breakdownError" class="space-y-hq-1">
        <label
          :for="organizerMessageId"
          class="font-jp text-sm text-ink-muted"
        >
          会員へのメッセージ (任意)
        </label>
        <Textarea
          :id="organizerMessageId"
          v-model="organizerMessage"
          :maxlength="ORGANIZER_MESSAGE_MAX"
          :rows="3"
          placeholder="例: 雨天のため中止します。次回ご参加お待ちしています。"
          :aria-describedby="organizerMessageCounterId"
          data-testid="organizer-message"
        />
        <p
          :id="organizerMessageCounterId"
          class="text-right font-jp text-xs text-ink-muted"
        >
          残り {{ remainingChars }} 文字 / {{ ORGANIZER_MESSAGE_MAX }} 文字以内
        </p>

        <!-- 送信メール本文プレビュー -->
        <div
          v-if="mailPreview"
          class="mt-hq-3 space-y-hq-1"
          data-testid="mail-preview"
        >
          <p class="font-jp text-sm text-ink-muted">
            送信されるメール本文 (プレビュー)
          </p>
          <div
            class="rounded-hq-sm border border-hairline bg-paper-warm px-hq-3 py-hq-2"
          >
            <p
              class="border-b border-hairline pb-hq-2 font-jp text-xs text-ink-muted"
              data-testid="mail-preview-subject"
            >
              件名: {{ mailPreview.subject }}
            </p>
            <pre
              class="mt-hq-2 whitespace-pre-wrap font-jp text-xs leading-relaxed text-ink"
              data-testid="mail-preview-body"
            >{{ mailPreview.body }}</pre>
          </div>
        </div>
      </div>

      <p
        v-if="deleteErrorMessage"
        role="alert"
        class="font-jp text-sm text-danger bg-danger-soft border border-danger/40 rounded-hq-sm px-hq-3 py-hq-2"
      >
        {{ deleteErrorMessage }}
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
          :disabled="!canConfirm"
          :aria-disabled="!canConfirm"
          class="inline-flex h-9 items-center justify-center rounded-hq-sm bg-danger px-hq-4 py-hq-2 text-sm font-jp font-medium text-paper shadow-hq-sm transition-colors hover:bg-danger/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-50"
          @click="onConfirm"
        >
          {{ isDeleting ? "削除中…" : "削除する" }}
        </button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
