<script setup lang="ts">
import { computed, toRef } from "vue";
import type { EventId } from "@high-q/shared";
import { useParticipantsFilter } from "@/features/participants-filter";
import { useEventParticipantsData } from "../composables/useEventParticipantsData";
import EventParticipantsToolbar from "./EventParticipantsToolbar.vue";
import EventParticipantsTable from "./EventParticipantsTable.vue";

/**
 * 参加者一覧 Widget。Toolbar + Table を統合し、4 状態のうち
 * Empty / Success（フィルタ後 0 件含む）を内部で出し分ける。
 *
 * Loading / Error / 親の event 取得失敗 は親 widget (event-detail) 側で扱う。
 *
 * 関連:
 *   openspec/changes/admin-event-detail-screen/specs/admin-event-detail/spec.md
 */

const props = defineProps<{
  eventId: EventId | null;
}>();

const eventIdRef = toRef(props, "eventId");

const emit = defineEmits<{
  /** Optimistic 反映済みのチェックイン状態変化（StatCard 連携用） */
  "checkin-changed": [delta: number];
  /** キャンセル代行成功（StatCard reserved_count -1 用） */
  "reservation-cancelled": [];
}>();

const {
  filter,
  setSearch,
  setExperience,
  setCheckinState,
} = useParticipantsFilter();

const data = useEventParticipantsData(eventIdRef);

const view = computed<"loading" | "empty" | "error" | "success">(() => {
  if (data.isError.value) return "error";
  if (data.isPending.value && data.rawData.value.length === 0) return "loading";
  if (data.rawData.value.length === 0) return "empty";
  return "success";
});

function onCheckinFlip(reservationId: string, nextChecked: boolean): void {
  // 現在の状態を読んで delta を算出（既に同じ状態なら delta=0）
  const current = data.rawData.value.find(
    (r) => (r.reservation_id as unknown as string) === reservationId,
  );
  if (!current) return;
  const wasChecked = current.checked_in_at !== null;
  if (wasChecked === nextChecked) return;
  data.applyCheckinFlip(reservationId, nextChecked);
  emit("checkin-changed", nextChecked ? 1 : -1);
}

function onCancelled(reservationId: string): void {
  data.removeRow(reservationId);
  emit("reservation-cancelled");
}

defineExpose({
  refetch: data.refetch,
  visibleCount: data.visibleCount,
  totalCount: computed(() => data.rawData.value.length),
  checkedInCount: data.checkedInCount,
});
</script>

<template>
  <div class="flex flex-col">
    <EventParticipantsToolbar
      :filter="filter"
      :visible-count="data.visibleCount.value"
      :total-count="data.rawData.value.length"
      :checked-in-count="data.checkedInCount.value"
      @update:search="setSearch"
      @update:experience="setExperience"
      @update:checkin-state="setCheckinState"
    />

    <div class="flex-1 overflow-auto px-hq-8 pt-hq-3">
      <p
        v-if="view === 'empty'"
        class="font-jp text-sm text-muted py-hq-8 text-center"
      >
        まだ予約がありません。
      </p>
      <p
        v-else-if="view === 'error'"
        role="alert"
        class="font-jp text-sm text-danger py-hq-8 text-center"
      >
        参加者の取得に失敗しました。
        <button
          type="button"
          class="underline-offset-4 hover:underline ml-hq-2"
          @click="data.refetch()"
        >
          再試行
        </button>
      </p>
      <p
        v-else-if="view === 'success' && data.visibleCount.value === 0"
        class="font-jp text-sm text-muted py-hq-8 text-center"
      >
        条件に一致する参加者がいません。
      </p>
      <EventParticipantsTable
        v-else-if="view === 'success'"
        :rows="data.data.value"
        @checkin-flip="onCheckinFlip"
        @cancelled="onCancelled"
      />
    </div>
  </div>
</template>
