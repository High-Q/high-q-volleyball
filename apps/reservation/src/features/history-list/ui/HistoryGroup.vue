<script setup lang="ts">
import { Kicker } from "@high-q/ui";
import type { MyReservationItem } from "@/entities/reservation";
import HistoryRow from "./HistoryRow.vue";

defineProps<{
  /** kicker 見出しに使うラベル（例: 「予約中」「キャンセル待ち」「キャンセル済み」「過去」） */
  label: string;
  items: ReadonlyArray<MyReservationItem>;
  /** 各行に取り消しボタンを描画するか（予約中 / キャンセル待ちグループのみ true） */
  showCancel?: boolean;
  /** 取り消しボタンのラベル（HistoryRow に委譲） */
  cancelLabel?: string;
  /** 再予約可否判定の基準時刻（省略時は各行が現在時刻を使用）。テスト固定用 */
  now?: Date;
}>();

const emit = defineEmits<{
  "request-cancel": [item: MyReservationItem];
  "request-rebook": [item: MyReservationItem];
}>();

function onRequestCancel(item: MyReservationItem): void {
  emit("request-cancel", item);
}

function onRequestRebook(item: MyReservationItem): void {
  emit("request-rebook", item);
}
</script>

<template>
  <section
    class="flex flex-col gap-hq-3"
    :aria-label="label"
    :data-testid="`history-group-${label}`"
  >
    <Kicker color="muted">— {{ label }} · {{ items.length }}</Kicker>
    <div class="flex flex-col gap-hq-2">
      <HistoryRow
        v-for="item in items"
        :key="item.id"
        :item="item"
        :show-cancel="showCancel"
        :cancel-label="cancelLabel"
        :now="now"
        @request-cancel="onRequestCancel"
        @request-rebook="onRequestRebook"
      />
    </div>
  </section>
</template>
