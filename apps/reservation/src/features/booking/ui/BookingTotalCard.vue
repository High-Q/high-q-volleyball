<script setup lang="ts">
import { computed } from "vue";

/**
 * 予約確認画面の合計金額カード (黒背景・「FEE · 当日現金」kicker)。
 *
 * 合計 = fee × (1 + guestCount)。
 * fee が null のとき (会場 default_fee も未設定) は「未定」表示。
 */

const props = defineProps<{
  /** 1 名あたりの参加費 (円)。NULL は未定扱い */
  fee: number | null;
  guestCount: number;
}>();

const headcount = computed(() => 1 + props.guestCount);

const total = computed(() =>
  props.fee === null ? null : props.fee * headcount.value,
);

const breakdownLabel = computed(() => {
  if (props.fee === null) {
    return "参加費は会場側で都度決定";
  }
  return `${headcount.value} 名 × ${props.fee.toLocaleString("ja-JP")} 円`;
});

const totalLabel = computed(() =>
  total.value === null ? "未定" : `${total.value.toLocaleString("ja-JP")} 円`,
);
</script>

<template>
  <div
    class="bg-ink text-paper rounded-hq-md px-hq-5 py-hq-4 flex items-center justify-between gap-hq-4"
    aria-label="合計金額"
  >
    <div class="flex flex-col gap-hq-1">
      <span class="font-mono text-xs tracking-widest opacity-70">
        FEE · 当日現金
      </span>
      <span class="font-jp text-xs opacity-80">{{ breakdownLabel }}</span>
    </div>
    <span class="font-jp-display text-xl font-medium">
      {{ totalLabel }}
    </span>
  </div>
</template>
