<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Button } from "@high-q/ui";
import { unsafeReservationId } from "@high-q/shared";
import {
  BookingDoneSummary,
  CancelBookingDialog,
  useCancelBooking,
} from "@/features/booking";
import { useEventDetail } from "@/features/event-detail";
import { useAuthSession } from "@/features/auth";
import { formatAvailability } from "@/entities/event";
import type { Reservation } from "@/entities/reservation";

const route = useRoute();
const router = useRouter();

const idRef = computed(() => String(route.params.id ?? ""));
const reservationIdRaw = computed(() => {
  const value = route.query.reservation;
  return typeof value === "string" ? value : "";
});

const { event, loading, error, notFound, reload } = useEventDetail(idRef);

const auth = useAuthSession();
const memberEmail = computed<string | null>(
  () => auth.member.value?.email ?? auth.session.value?.user.email ?? null,
);

const reservation = ref<Reservation | null>(null);

const cancel = useCancelBooking();
const dialogOpen = ref<boolean>(false);

/** キャンセル成功後、対象イベントが受付可能なときに再予約導線を出すための状態 */
const cancelledRebookable = ref<boolean>(false);

/** 対象イベントが受付可能（未開催 × 非満席）か。新規予約と同一基準 */
const eventBookable = computed<boolean>(
  () =>
    event.value !== null &&
    Date.parse(event.value.startAt) > Date.now() &&
    !formatAvailability(event.value.availability).isFull,
);

const cancelErrorMessage = computed(() => {
  switch (cancel.error.value) {
    case "rls":
      return "キャンセルに失敗しました。既にキャンセル済みか、対象が見つかりません。";
    case "network":
      return "通信エラーが発生しました。時間を置いて再度お試しください。";
    case "unknown":
      return "予期しないエラーが発生しました。";
    default:
      return undefined;
  }
});

onMounted(() => {
  if (reservationIdRaw.value.length === 0) {
    void router.replace({ name: "events-list" });
    return;
  }
  reservation.value = {
    id: unsafeReservationId(reservationIdRaw.value),
    eventId: idRef.value as unknown as Reservation["eventId"],
    memberId: "" as unknown as Reservation["memberId"],
    status: "reserved",
    guestCount: 0,
    phoneAtBooking: null,
    note: null,
  };
});

function openDialog(): void {
  cancel.reset();
  dialogOpen.value = true;
}

async function onConfirmCancel(): Promise<void> {
  const r = reservation.value;
  if (r === null) return;
  const ok = await cancel.cancel(r.id);
  if (ok) {
    dialogOpen.value = false;
    if (eventBookable.value) {
      // 受付可能なら一覧へ飛ばさず、再予約導線を含む結果表示に切り替える
      cancelledRebookable.value = true;
    } else {
      void router.replace({ name: "events-list", query: { cancelled: "1" } });
    }
  }
}

function onRebook(): void {
  void router.push({
    name: "event-detail",
    params: { id: idRef.value },
    query: { book: "1" },
  });
}

function goToList(): void {
  void router.push({ name: "events-list" });
}
</script>

<template>
  <main class="min-h-screen bg-paper text-ink font-jp flex flex-col">
    <header
      class="px-hq-5 py-hq-4 flex items-start justify-between gap-hq-4 border-b border-hairline"
    >
      <span class="font-jp-display text-lg text-ink">High Q</span>
      <span
        class="font-mono text-xs text-muted tracking-widest uppercase"
        aria-hidden="true"
      >
        DONE
      </span>
    </header>

    <section class="flex-1 px-hq-5 py-hq-6 flex flex-col gap-hq-5">
      <template v-if="loading">
        <div class="flex flex-col gap-hq-4" aria-label="読み込み中">
          <div class="bg-surface border border-hairline rounded-hq-lg h-32 animate-pulse" />
          <div class="bg-surface border border-hairline rounded-hq-lg h-40 animate-pulse" />
        </div>
      </template>

      <div
        v-else-if="error !== null"
        class="bg-surface border border-hairline rounded-hq-lg p-hq-5 flex flex-col gap-hq-3"
        role="alert"
      >
        <p class="font-jp text-sm text-ink m-0">
          イベント情報を取得できませんでした。
        </p>
        <div class="flex gap-hq-3">
          <Button variant="outline" size="sm" @click="reload">再試行</Button>
          <Button variant="ghost" size="sm" @click="goToList">
            イベント一覧へ戻る
          </Button>
        </div>
      </div>

      <div
        v-else-if="notFound"
        class="bg-surface border border-hairline rounded-hq-lg p-hq-5 flex flex-col gap-hq-3"
      >
        <p class="font-jp text-sm text-ink m-0">
          イベントが見つかりません。
        </p>
        <Button variant="outline" size="sm" @click="goToList">
          イベント一覧へ戻る
        </Button>
      </div>

      <div
        v-else-if="cancelledRebookable"
        class="bg-surface border border-hairline rounded-hq-lg p-hq-5 flex flex-col gap-hq-4"
        data-testid="booking-cancelled-rebook"
      >
        <p class="font-jp-display text-lg text-ink m-0">
          予約をキャンセルしました。
        </p>
        <p class="font-jp text-sm text-muted m-0">
          やっぱり参加したい場合は、もう一度予約できます。
        </p>
        <Button
          variant="primary"
          size="md"
          data-testid="booking-rebook"
          @click="onRebook"
        >
          やっぱり予約する
        </Button>
      </div>

      <BookingDoneSummary
        v-else-if="event !== null && reservation !== null"
        :reservation="reservation"
        :event="event"
        :member-email="memberEmail"
        @request-cancel="openDialog"
      />
    </section>

    <div
      class="sticky bottom-0 left-0 right-0 bg-paper border-t border-hairline px-hq-5 py-hq-4"
    >
      <Button variant="outline" size="md" class="w-full" @click="goToList">
        イベント一覧へ
      </Button>
    </div>

    <CancelBookingDialog
      v-if="event !== null"
      :open="dialogOpen"
      :event-start-at="event.startAt"
      :submitting="cancel.submitting.value"
      :error-message="cancelErrorMessage"
      @update:open="dialogOpen = $event"
      @confirm="onConfirmCancel"
    />
  </main>
</template>
