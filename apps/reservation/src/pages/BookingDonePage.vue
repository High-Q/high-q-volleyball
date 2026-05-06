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
import type { Reservation } from "@/entities/reservation";

const route = useRoute();
const router = useRouter();

const idRef = computed(() => String(route.params.id ?? ""));
const reservationIdRaw = computed(() => {
  const value = route.query.reservation;
  return typeof value === "string" ? value : "";
});

const { event, loading, error, notFound, reload } = useEventDetail(idRef);

const reservation = ref<Reservation | null>(null);

const cancel = useCancelBooking();
const dialogOpen = ref<boolean>(false);

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
    void router.replace({ name: "events-list", query: { cancelled: "1" } });
  }
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
          <Button variant="secondary" size="sm" @click="reload">再試行</Button>
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
        <Button variant="secondary" size="sm" @click="goToList">
          イベント一覧へ戻る
        </Button>
      </div>

      <BookingDoneSummary
        v-else-if="event !== null && reservation !== null"
        :reservation="reservation"
        :event="event"
        @request-cancel="openDialog"
      />
    </section>

    <div
      class="sticky bottom-0 left-0 right-0 bg-paper border-t border-hairline px-hq-5 py-hq-4"
    >
      <Button variant="secondary" size="md" class="w-full" @click="goToList">
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
