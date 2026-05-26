<script setup lang="ts">
import { computed } from "vue";
import { Button } from "@high-q/ui";
import { formatAvailability, type EventAvailability } from "@/entities/event";
import { formatFee } from "@/shared/lib/format-date";

/**
 * イベント詳細画面の sticky bottom CTA。
 *
 * 「予約に進む」押下で `proceed` event を emit する。実際のシート開閉は親
 * (EventDetailPage) が制御する。満員時は disabled + ラベル「予約締切」に
 * 切り替わり、`proceed` は emit されない。
 *
 * 関連:
 *   openspec/changes/reservation-event-availability/specs/reservation-events-and-booking/spec.md
 */

const props = defineProps<{
  fee: number | null;
  /** capacity あり、reservedCount >= capacity で「予約締切」に切替。null は通常表示 */
  availability?: EventAvailability | null;
}>();

const emit = defineEmits<{
  (e: "proceed"): void;
}>();

const isFull = computed(
  () => formatAvailability(props.availability ?? null).isFull,
);

function onClick(): void {
  if (isFull.value) return;
  emit("proceed");
}
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
      <Button
        variant="primary"
        size="md"
        :disabled="isFull"
        :data-testid="isFull ? 'cta-full' : 'cta-proceed'"
        @click="onClick"
      >
        {{ isFull ? "予約締切" : "予約に進む" }}
      </Button>
    </div>
  </div>
</template>
