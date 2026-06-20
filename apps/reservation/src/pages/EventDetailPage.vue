<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Button, Kicker } from "@high-q/ui";
import {
  EventInfoBlock,
  EventStickyCta,
  useEventDetail,
} from "@/features/event-detail";
import { BookingSheet } from "@/features/booking";
import { formatAvailability } from "@/entities/event";
import { PageBreadcrumb } from "@/widgets/page-breadcrumb";
import { formatJaDate } from "@/shared/lib/format-date";

const route = useRoute();
const router = useRouter();

const idRef = computed(() => String(route.params.id ?? ""));
const { event, loading, error, notFound, reload } = useEventDetail(idRef);

const dateLabel = computed(() =>
  event.value === null ? "" : formatJaDate(event.value.startAt),
);

const bookingSheetOpen = ref<boolean>(false);

/**
 * 再予約導線（履歴の「再予約する」/ 完了画面の「やっぱり予約する」）の共通着地点。
 * `?book=1` 付きで到達し、対象イベントが受付可能（未開催 × 非満席）なときのみ
 * create モードの予約 Sheet を自動オープンする。受付不可なら開かず通常詳細を見せる。
 * 再オープン（ブラウザ戻る等）を防ぐため、判定後は book クエリを履歴から除去する。
 */
let deepLinkHandled = false;
watch(
  event,
  (loaded) => {
    if (deepLinkHandled || loaded === null) return;
    deepLinkHandled = true;
    if (route.query.book !== "1") return;
    const bookable =
      Date.parse(loaded.startAt) > Date.now() &&
      !formatAvailability(loaded.availability).isFull;
    if (bookable) {
      bookingSheetOpen.value = true;
    }
    const nextQuery = { ...route.query };
    delete nextQuery.book;
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
            class="font-jp-display text-2xl font-medium text-ink leading-snug mt-hq-2 m-0"
          >
            {{ event.name }}
          </h1>
        </div>

        <EventInfoBlock :event="event" />
      </template>
    </section>

    <EventStickyCta
      v-if="event !== null"
      :fee="event.fee"
      :availability="event.availability"
      @proceed="bookingSheetOpen = true"
    />

    <BookingSheet
      v-if="event !== null"
      :open="bookingSheetOpen"
      :event="event"
      @update:open="bookingSheetOpen = $event"
    />
  </main>
</template>
