<script setup lang="ts">
import { Kicker } from "@high-q/ui";
import type { MyReservationItem } from "@/entities/reservation";
import HistoryRow from "./HistoryRow.vue";

defineProps<{
  /** kicker 見出しに使うラベル（例: 「予約中」「過去」） */
  label: string;
  items: ReadonlyArray<MyReservationItem>;
  /** 各行にキャンセルボタンを描画するか（予約中グループのみ true） */
  showCancel?: boolean;
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
        @request-cancel="onRequestCancel"
      />
    </div>
  </section>
</template>
