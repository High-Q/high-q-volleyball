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
  /**
   * Optimistic 反映済みのチェックイン人数変化（StatCard 連携用）。
   * delta は本人 + 同伴を含む人数 (= ±(1 + guest_count))。
   */
  "checkin-changed": [delta: number];
  /**
   * キャンセル代行成功時、減らすべき予約人数 / チェックイン済人数。
   * いずれも本人 + 同伴を含む。チェックイン未の場合は checkinDelta=0。
   */
  "reservation-cancelled": [reservedDelta: number, checkinDelta: number];
  /**
   * 同伴者数編集時、StatCard に反映する人数 delta。
   * - 予約数: 常に同伴差分 (next - prev)
   * - チェックイン: 当該予約が attended なら同伴差分、reserved なら 0
   */
  "guest-changed": [reservedDelta: number, checkinDelta: number];
  /**
   * 任意の mutation が DB 反映完了した時点で発火。EventDetailWidget が
   * 受けて event_detail_view を refetch し、StatCard の集計を最新化する
   * (複数 admin の同時操作にも整合)。
   */
  "mutation-settled": [];
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
  // 本人 + 同伴の人数分を delta として通知
  const headcount = 1 + current.guest_count;
  emit("checkin-changed", nextChecked ? headcount : -headcount);
}

function onGuestChanged(
  reservationId: string,
  prev: number,
  next: number,
): void {
  if (prev === next) return;
  const current = data.rawData.value.find(
    (r) => (r.reservation_id as unknown as string) === reservationId,
  );
  data.applyGuestUpdate(reservationId, next);
  const guestDelta = next - prev;
  const isAttended = current?.checked_in_at !== null;
  emit("guest-changed", guestDelta, isAttended ? guestDelta : 0);
}

function onCancelled(reservationId: string): void {
  // キャンセル前の行を読んで予約人数 / チェックイン人数の delta を算出
  const current = data.rawData.value.find(
    (r) => (r.reservation_id as unknown as string) === reservationId,
  );
  const headcount = current ? 1 + current.guest_count : 0;
  const wasChecked = current?.checked_in_at !== null;
  data.removeRow(reservationId);
  emit(
    "reservation-cancelled",
    -headcount,
    wasChecked ? -headcount : 0,
  );
}

/**
 * Table から「mutation 完了」を受けて、participants_view を refetch して
 * 真値で rawData を上書き (optimistic と DB の同期)。さらに上位
 * EventDetailWidget に伝搬し、event_detail_view も refetch させる。
 *
 * 既存 `requestSeq` ガードにより、複数並列 refetch が来ても古い結果は
 * 自動で捨てられる (useEventParticipantsData / useEventDetailData 共通)。
 */
async function onMutationSettled(): Promise<void> {
  await data.refetch();
  emit("mutation-settled");
}

defineExpose({
  refetch: data.refetch,
  visibleCount: data.visibleCount,
  totalCount: computed(() => data.rawData.value.length),
  checkedInCount: data.checkedInCount,
});
</script>

<template>
  <div class="flex h-full flex-col">
    <EventParticipantsToolbar
      :filter="filter"
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
        @guest-changed="onGuestChanged"
        @cancelled="onCancelled"
        @mutation-settled="onMutationSettled"
      />
    </div>
  </div>
</template>
