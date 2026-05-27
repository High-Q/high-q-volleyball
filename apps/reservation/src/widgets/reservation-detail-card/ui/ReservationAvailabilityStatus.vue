<script setup lang="ts">
import { computed } from "vue";
import type { EventAvailability } from "@/entities/event";
import AvailabilityStrip from "@/shared/ui/AvailabilityStrip.vue";

/**
 * 予約詳細画面用の「予約状況」セクション。
 *
 * Meta テーブル直下、Cancel Policy ボックスの上に配置される。`AvailabilityStrip`
 * (variant=light) を内側に持ち、セクションラベルを capacity 状態に応じて
 * 動的切替する。文言は `formatAvailability` 経由でイベント一覧 / 詳細と統一。
 *
 * 関連:
 *   openspec/changes/reservation-mine-availability/specs/reservation-detail-page/spec.md
 */

const props = defineProps<{
  availability: EventAvailability | null;
}>();

const sectionLabel = computed(() => {
  const a = props.availability;
  if (a === null) return "予約状況";
  if (a.capacity === null) return "予約状況";
  if (a.reservedCount >= a.capacity) return "満員";
  return "あと何名";
});
</script>

<template>
  <section
    class="bg-surface border border-hairline rounded-hq-lg px-hq-5 py-hq-4 flex flex-col gap-hq-3"
    data-testid="reservation-availability-status"
  >
    <h2
      class="font-mono text-xs text-muted tracking-widest uppercase m-0"
      data-testid="reservation-availability-label"
    >
      {{ sectionLabel }}
    </h2>
    <AvailabilityStrip :availability="availability" variant="light" />
  </section>
</template>
