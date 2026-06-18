<script setup lang="ts">
import { computed, onUnmounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Button, Kicker } from "@high-q/ui";
import {
  EventInfoBlock,
  EventStickyCta,
  useEventDetail,
  useMyEventReservation,
} from "@/features/event-detail";
import { BookingSheet } from "@/features/booking";
import type { Reservation } from "@/entities/reservation";
import { PageBreadcrumb } from "@/widgets/page-breadcrumb";
import { formatJaDate } from "@/shared/lib/format-date";

const route = useRoute();
const router = useRouter();

const idRef = computed(() => String(route.params.id ?? ""));
const { event, loading, error, notFound, reload } = useEventDetail(idRef);

// 当該会員の当該イベントに対する予約状態 (満員時の CTA 分岐を駆動)
const {
  myReservation,
  resolved: selfResolved,
  setLocal: setMyReservation,
} = useMyEventReservation(idRef);

const dateLabel = computed(() =>
  event.value === null ? "" : formatJaDate(event.value.startAt),
);

const bookingSheetOpen = ref<boolean>(false);
const bookingSheetMode = ref<"create" | "waitlist">("create");

// 登録完了フィードバック (role="status" のインライン通知。Toast 基盤は未導入)
const successNotice = ref<string | null>(null);
let successTimer: ReturnType<typeof setTimeout> | null = null;

function showSuccess(message: string): void {
  successNotice.value = message;
  if (successTimer !== null) clearTimeout(successTimer);
  successTimer = setTimeout(() => {
    successNotice.value = null;
  }, 4000);
}

onUnmounted(() => {
  if (successTimer !== null) clearTimeout(successTimer);
});

function openBooking(): void {
  bookingSheetMode.value = "create";
  bookingSheetOpen.value = true;
}

function openWaitlist(): void {
  bookingSheetMode.value = "waitlist";
  bookingSheetOpen.value = true;
}

function onSheetSaved(reservation: Reservation): void {
  if (bookingSheetMode.value !== "waitlist") return;
  // 楽観的に自己予約状態を waitlist へ更新し、CTA を「登録済み」に即時切替
  setMyReservation({
    id: reservation.id,
    status: reservation.status,
    guestCount: reservation.guestCount,
    note: reservation.note ?? "",
  });
  showSuccess("キャンセル待ちに登録しました。空きが出た場合にご連絡します。");
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
      <div class="flex flex-col gap-hq-1">
        <PageBreadcrumb
          :items="[
            { label: 'マイページ', to: { name: 'events-list' } },
            { label: 'イベント', to: { name: 'events-list' } },
            { label: event !== null ? event.name : '詳細' },
          ]"
        />
        <span class="font-jp-display text-lg text-ink mt-hq-1">High Q</span>
      </div>
    </header>

    <section class="flex-1 px-hq-5 py-hq-6 flex flex-col gap-hq-5">
      <template v-if="loading">
        <div class="flex flex-col gap-hq-4" aria-label="読み込み中">
          <div class="bg-surface border border-hairline rounded-hq-lg h-10 animate-pulse" />
          <div class="bg-surface border border-hairline rounded-hq-lg h-48 animate-pulse" />
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

      <template v-else-if="event !== null">
        <div class="flex flex-col gap-hq-2">
          <Kicker>— {{ dateLabel }}</Kicker>
          <h1
            class="font-jp-display text-2xl font-medium text-ink leading-snug mt-hq-2 m-0"
          >
            {{ event.name }}
          </h1>
        </div>

        <EventInfoBlock :event="event" />

        <p
          v-if="successNotice !== null"
          role="status"
          class="bg-accent-soft text-accent border border-accent rounded-hq-md px-hq-4 py-hq-3 font-jp text-sm m-0"
          data-testid="waitlist-success-notice"
        >{{ successNotice }}</p>
      </template>
    </section>

    <EventStickyCta
      v-if="event !== null"
      :fee="event.fee"
      :availability="event.availability"
      :self-status="myReservation?.status ?? null"
      :self-resolved="selfResolved"
      @proceed="openBooking"
      @waitlist="openWaitlist"
    />

    <BookingSheet
      v-if="event !== null"
      :open="bookingSheetOpen"
      :event="event"
      :mode="bookingSheetMode"
      @update:open="bookingSheetOpen = $event"
      @saved="onSheetSaved"
    />
  </main>
</template>
