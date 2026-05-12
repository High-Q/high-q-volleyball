<script setup lang="ts">
import { Button } from "@high-q/ui";
import { formatFee } from "@/shared/lib/format-date";

/**
 * イベント詳細画面の sticky bottom CTA。
 *
 * 「予約に進む」押下で `proceed` event を emit する。実際のシート開閉は親
 * (EventDetailPage) が制御する。
 *
 * 関連:
 *   openspec/changes/reservation-booking-flow/specs/reservation-booking-flow/spec.md
 *   openspec/changes/reservation-booking-flow/specs/reservation-events-and-booking/spec.md
 */

const props = defineProps<{
  fee: number | null;
}>();

const emit = defineEmits<{
  (e: "proceed"): void;
}>();
</script>

<template>
  <div
    class="sticky bottom-0 left-0 right-0 bg-paper border-t border-hairline px-hq-5 py-hq-4 flex flex-col gap-hq-2"
    role="region"
    aria-label="予約アクション"
  >
    <div class="flex items-center justify-between gap-hq-4">
      <span class="font-mono text-sm text-ink-soft">
        {{ formatFee(props.fee) }}
      </span>
      <Button variant="ink" size="md" @click="emit('proceed')">
        予約に進む
      </Button>
    </div>
  </div>
</template>
