<script setup lang="ts">
import { computed } from "vue";
import { formatAvailability, type EventListItem } from "@/entities/event";
import type { ReservationId } from "@/entities/reservation";
import { formatFee, formatTimeRange } from "@/shared/lib/format-date";
import {
  jstDay,
  jstMonth,
  jstWeekday,
} from "@/shared/lib/jst-calendar";
import AvailabilityChip from "@/shared/ui/AvailabilityChip.vue";

const WEEKDAY_JA = ["日", "月", "火", "水", "木", "金", "土"] as const;

const props = defineProps<{
  event: EventListItem;
  /** availability 取得中の間は true (一覧画面側で loading フラグを束ねて渡す) */
  availabilityLoading?: boolean;
  /**
   * 当該行のイベントに対する自分の予約 ID。
   * 渡された場合は遷移先を `/reservations/{reservationId}` に切り替え、「予約済」chip を描画する。
   * NEXT カードに昇格した最早 1 件は呼び出し側 (EventsListPage) で除外されるため、
   * 本 props で扱うのは 2 件目以降の自分予約。
   */
  reservationId?: ReservationId | null;
  /**
   * 当該行のイベントに対する自分のキャンセル待ち登録 ID。
   * 渡された場合は遷移先を `/reservations/{reservationId}` に切り替え、「キャンセル待ち」chip を描画する。
   * `reservationId` (予約済) が優先される。
   */
  waitlistReservationId?: ReservationId | null;
}>();

const startDate = computed(() => new Date(props.event.startAt));

const monthDay = computed(() => {
  const d = startDate.value;
  if (Number.isNaN(d.getTime())) return "—";
  return `${String(jstMonth(d) + 1).padStart(2, "0")} / ${String(jstDay(d)).padStart(2, "0")}`;
});

const weekday = computed(() => {
  const d = startDate.value;
  if (Number.isNaN(d.getTime())) return "";
  return WEEKDAY_JA[jstWeekday(d)];
});

const timeLabel = computed(() =>
  formatTimeRange(props.event.startAt, props.event.endAt),
);
const feeLabel = computed(() => formatFee(props.event.fee));

const hasMyReservation = computed(
  () => props.reservationId !== null && props.reservationId !== undefined,
);

const hasMyWaitlist = computed(
  () =>
    !hasMyReservation.value &&
    props.waitlistReservationId !== null &&
    props.waitlistReservationId !== undefined,
);

const isFull = computed(
  () => formatAvailability(props.event.availability).isFull,
);

/**
 * 満員かつ自分が未登録（予約済み / キャンセル待ち登録済みのいずれでもない）の行に、
 * 「キャンセル待ち受付中」のヒントを出す。タップで詳細のキャンセル待ち導線に進める
 * ことを一覧上で示唆する。
 */
const showWaitlistHint = computed(
  () => isFull.value && !hasMyReservation.value && !hasMyWaitlist.value,
);

const linkTo = computed(() => {
  if (hasMyReservation.value) {
    return {
      name: "reservation-detail",
      params: { reservationId: props.reservationId as ReservationId },
    };
  }
  if (hasMyWaitlist.value) {
    return {
      name: "reservation-detail",
      params: { reservationId: props.waitlistReservationId as ReservationId },
    };
  }
  return { name: "event-detail", params: { id: props.event.id } };
});
</script>

<template>
  <router-link
    :to="linkTo"
    class="flex items-center gap-hq-4 px-hq-4 py-hq-4 bg-paper-warm border border-hairline rounded-hq-md no-underline text-ink hover:shadow-hq-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent transition"
    data-testid="event-row"
  >
    <div
      class="flex flex-col items-center justify-center pr-hq-3 border-r border-hairline shrink-0 w-16"
    >
      <span
        class="font-mono text-sm font-medium text-ink"
        data-testid="event-row-date"
      >{{ monthDay }}</span>
      <span
        class="font-mono text-[10px] text-muted tracking-widest mt-hq-1"
        data-testid="event-row-weekday"
      >{{ weekday }}</span>
    </div>

    <div class="flex-1 min-w-0 flex flex-col gap-hq-1">
      <span
        v-if="event.vol !== null"
        class="font-mono text-[10px] text-accent tracking-widest"
        data-testid="event-row-vol"
      >vol.{{ event.vol }}</span>
      <p
        class="font-jp text-sm font-medium text-ink m-0 truncate"
        data-testid="event-row-name"
      >{{ event.name }}</p>
      <p class="font-jp text-xs text-muted m-0">
        <span data-testid="event-row-time">{{ timeLabel }}</span>
        <span aria-hidden="true"> · </span>
        <span data-testid="event-row-fee">{{ feeLabel }}</span>
      </p>
      <div class="flex items-center gap-hq-2 flex-wrap">
        <AvailabilityChip
          :availability="event.availability"
          :loading="availabilityLoading"
        />
        <span
          v-if="hasMyReservation"
          class="inline-flex items-center font-jp text-xs font-medium leading-none px-hq-2 py-hq-1 rounded-hq-pill bg-accent-soft text-accent"
          data-testid="event-row-mine-badge"
          aria-label="自分が予約済み"
        >予約済</span>
        <span
          v-else-if="hasMyWaitlist"
          class="inline-flex items-center font-jp text-xs font-medium leading-none px-hq-2 py-hq-1 rounded-hq-pill bg-paper-warm border border-hairline text-muted"
          data-testid="event-row-waitlist-badge"
          aria-label="キャンセル待ち登録済み"
        >キャンセル待ち</span>
        <span
          v-else-if="showWaitlistHint"
          class="inline-flex items-center font-jp text-xs font-medium leading-none px-hq-2 py-hq-1 rounded-hq-pill bg-accent-soft text-accent"
          data-testid="event-row-waitlist-hint"
          aria-label="キャンセル待ち受付中"
        >キャンセル待ち受付中</span>
      </div>
    </div>
  </router-link>
</template>
