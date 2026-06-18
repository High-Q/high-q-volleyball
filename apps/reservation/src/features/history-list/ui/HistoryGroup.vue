<script setup lang="ts">
import { Kicker } from "@high-q/ui";
import type { MyReservationItem } from "@/entities/reservation";
import HistoryRow from "./HistoryRow.vue";

defineProps<{
  /** kicker 見出しに使うラベル（例: 「予約中」「キャンセル待ち」「過去」） */
  label: string;
  items: ReadonlyArray<MyReservationItem>;
  /** 各行に取り消しボタンを描画するか（予約中 / キャンセル待ちグループのみ true） */
  showCancel?: boolean;
  /** 取り消しボタンのラベル（HistoryRow に委譲） */
  cancelLabel?: string;
}>();

const emit = defineEmits<{
  "request-cancel": [item: MyReservationItem];
}>();

function onRequestCancel(item: MyReservationItem): void {
  emit("request-cancel", item);
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
        @request-cancel="onRequestCancel"
      />
    </div>
  </section>
</template>
