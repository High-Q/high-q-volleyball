<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from "vue";
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
import { formatAvailability } from "@/entities/event";
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
  loading: selfLoading,
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

/**
 * 予約 Sheet のディープリンク起動。再予約導線（履歴の「再予約する」/ 完了画面の
 * 「やっぱり予約する」）と LINE 告知の予約直行リンク (#386) の共通着地点。
 *
 * `?book=1` 付きで到達し、対象イベントが受付可能（未開催 × 非満席）かつ本人に有効な
 * 予約（予約済み / キャンセル待ち）が無いときのみ create モードの予約 Sheet を自動
 * オープンする。告知リンクは予約済みの会員もタップするため、本人予約状態の読み込み
 * 完了まで判定を待ち、取得に失敗した場合は開かない（重複予約に進ませない安全側）。
 *
 * 判定後は再オープン（ブラウザ戻る等）を防ぐため book クエリを履歴から除去する。
 * LINE で標準ブラウザを開かせる `openExternalBrowser` は会員サイトでは意味を持たない
 * ため、book の有無にかかわらず同時に除去する。
 */
const ACTIVE_RESERVATION_STATUSES = new Set(["reserved", "waitlist"]);
let deepLinkHandled = false;
watch(
  [event, selfLoading, selfResolved],
  ([loaded, reservationLoading]) => {
    if (deepLinkHandled || loaded === null || reservationLoading) return;
    deepLinkHandled = true;
    if (route.query.book === "1") {
      const bookable =
        Date.parse(loaded.startAt) > Date.now() &&
        !formatAvailability(loaded.availability).isFull;
      const hasActiveReservation =
        myReservation.value !== null &&
        ACTIVE_RESERVATION_STATUSES.has(myReservation.value.status);
      if (bookable && selfResolved.value && !hasActiveReservation) {
        bookingSheetOpen.value = true;
      }
    }
    if (!("book" in route.query) && !("openExternalBrowser" in route.query)) {
      return;
    }
    const nextQuery = { ...route.query };
    delete nextQuery.book;
    delete nextQuery.openExternalBrowser;
    void router.replace({ query: nextQuery });
  },
  { immediate: true },
);

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
            class="font-jp-display text-4xl font-medium text-ink leading-snug mt-hq-2 m-0"
            data-testid="event-title"
          >
            {{ event.name
            }}<template v-if="event.vol !== null"
              ><br /><span
                class="font-mono text-accent"
                data-testid="event-title-volume"
                >vol.{{ event.vol }}</span
              ></template
            >
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
