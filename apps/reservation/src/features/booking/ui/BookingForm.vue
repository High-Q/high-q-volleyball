<script setup lang="ts">
import { computed } from "vue";
import { FormField } from "@/shared/ui";
import type { BookingDraft } from "@/entities/reservation";

/**
 * 予約確認画面の入力ブロック。
 *
 * - 同伴者数 (stepper UI)
 * - 連絡事項 (textarea)
 *
 * 氏名 / メール / 電話番号 / 経験レベルは別 component (BookingReadOnlyProfile)
 * で会員プロフィールから引き継いで読み取り専用表示する。
 *
 * 親から渡される `draft` は `reactive` object を直接共有する設計。
 * 子側で `draft.guestCount++` のように mutate すると親も即時反映される。
 *
 * 関連:
 *   openspec/changes/reservation-booking-flow/specs/reservation-booking-flow/spec.md
 */

const MAX_GUEST_COUNT = 5;

const props = defineProps<{
  /** 親が provide する reactive な draft (mutate される) */
  draft: BookingDraft;
  /** 「予約を確定する」を押下後のエラー (バリデーション NG 時に表示) */
  errors?: BookingFormErrors;
}>();

const guestLabel = computed(() => `${props.draft.guestCount} 名`);

function decGuest(): void {
  if (props.draft.guestCount > 0) {
    props.draft.guestCount = props.draft.guestCount - 1;
  }
}
function incGuest(): void {
  if (props.draft.guestCount < MAX_GUEST_COUNT) {
    props.draft.guestCount = props.draft.guestCount + 1;
  }
}

function onNoteInput(e: Event): void {
  const t = e.target as HTMLTextAreaElement;
  props.draft.note = t.value;
}

export type BookingFormErrors = {
  guestCount?: string;
};
</script>

<template>
  <div class="flex flex-col gap-hq-5">
    <FormField
      label="同伴者人数"
      hint="自分は除く・最大 5 名まで"
      :error="props.errors?.guestCount"
    >
      <template #default="{ ariaInvalid }">
        <div
          class="flex items-center justify-between gap-hq-3 bg-paper-warm border border-hairline rounded-hq-md px-hq-3 py-hq-2"
          :aria-invalid="ariaInvalid"
        >
          <button
            type="button"
            class="w-10 h-10 rounded-hq-sm bg-paper border border-hairline font-jp text-lg text-ink disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="props.draft.guestCount === 0"
            aria-label="同伴者人数を減らす"
            @click="decGuest"
          >
            −
          </button>
          <span class="font-jp text-base text-ink font-medium">
            {{ guestLabel }}
          </span>
          <button
            type="button"
            class="w-10 h-10 rounded-hq-sm bg-paper border border-hairline font-jp text-lg text-ink disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="props.draft.guestCount === MAX_GUEST_COUNT"
            aria-label="同伴者人数を増やす"
            @click="incGuest"
          >
            ＋
          </button>
        </div>
      </template>
    </FormField>

    <FormField label="連絡事項" hint="任意 · アレルギー / 質問など">
      <template #default="{ fieldId, messageId, ariaInvalid }">
        <textarea
          :id="fieldId"
          :value="props.draft.note"
          :aria-describedby="messageId"
          :aria-invalid="ariaInvalid"
          rows="3"
          class="w-full rounded-hq-md border border-hairline bg-paper px-hq-3 py-hq-2 font-jp text-base text-ink placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          placeholder="ご不明な点があればこちらに"
          @input="onNoteInput"
        />
      </template>
    </FormField>
  </div>
</template>
