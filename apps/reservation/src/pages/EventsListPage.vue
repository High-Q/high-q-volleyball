<script setup lang="ts">
import { computed } from "vue";
import { Button, Kicker } from "@high-q/ui";
import {
  EventRow,
  useNextReservation,
  useUpcomingEvents,
} from "@/features/event-listing";
import { HomeHeader } from "@/widgets/home-header";
import { HomeNextCard } from "@/widgets/home-next-card";
import { CorrectionRequestPanel } from "@/widgets/correction-request-panel";
import { useAuthSession } from "@/features/auth";
import { resolveMemberDisplayName } from "@/entities/member";

const session = useAuthSession();

const correctionRequests = computed(
  () => session.member.value?.correctionRequests ?? [],
);

const memberForHeader = computed(() => ({
  displayName: session.member.value?.displayName ?? "",
  nickname: session.member.value?.nickname ?? null,
}));

const greetingName = computed(() =>
  session.member.value === null
    ? ""
    : resolveMemberDisplayName(session.member.value),
);

const uid = session.session.value?.user.id ?? "";

const {
  reservation: nextReservation,
  mineByEventId,
  loading: nextLoading,
  error: nextError,
  reload: reloadNext,
} = useNextReservation(uid);

const {
  events,
  loading: eventsLoading,
  error: eventsError,
  reload: reloadEvents,
} = useUpcomingEvents();

const otherEvents = computed(() => {
  const nextEventId = nextReservation.value?.event.id;
  if (nextEventId === undefined) return events.value;
  return events.value.filter((ev) => ev.id !== nextEventId);
});

const loading = computed(() => nextLoading.value || eventsLoading.value);
const error = computed(() => nextError.value ?? eventsError.value);

const isEmpty = computed(
  () =>
    !loading.value &&
    error.value === null &&
    nextReservation.value === null &&
    otherEvents.value.length === 0,
);

async function reloadAll(): Promise<void> {
  await Promise.all([reloadNext(), reloadEvents()]);
}
</script>

<template>
  <main class="min-h-screen bg-paper text-ink font-jp flex flex-col">
    <HomeHeader :member="memberForHeader" />

    <section
      v-if="correctionRequests.length > 0"
      class="px-hq-5 pt-hq-3"
    >
      <CorrectionRequestPanel mode="inline" :requests="correctionRequests" />
    </section>

    <section class="px-hq-5 pt-hq-3 pb-hq-4">
      <Kicker>— こんにちは、{{ greetingName }}さん</Kicker>
    </section>

    <section
      class="flex-1 px-hq-5 pb-hq-8 flex flex-col gap-hq-5"
      :aria-busy="loading"
    >
      <template v-if="loading">
        <div
          class="bg-ink border border-hairline rounded-hq-lg h-44 animate-pulse"
          aria-label="読み込み中"
          data-testid="home-loading-next"
        />
        <div
          v-for="i in 3"
          :key="i"
          class="bg-paper-warm border border-hairline rounded-hq-md h-16 animate-pulse"
          aria-label="読み込み中"
          data-testid="home-loading-row"
        />
      </template>

      <div
        v-else-if="error !== null"
        class="bg-surface border border-hairline rounded-hq-lg p-hq-5 flex flex-col gap-hq-3"
        role="alert"
        data-testid="home-error"
      >
        <p class="font-jp text-sm text-ink m-0">
          情報を取得できませんでした。
        </p>
        <Button variant="outline" size="sm" @click="reloadAll">
          再試行
        </Button>
      </div>

      <template v-else>
        <HomeNextCard
          v-if="nextReservation !== null"
          :reservation="nextReservation"
        />

        <div
          v-if="isEmpty"
          class="bg-surface border border-hairline rounded-hq-lg p-hq-5 flex flex-col gap-hq-3"
          data-testid="home-empty"
        >
          <p class="font-jp text-sm text-ink m-0">
            現在開催予定のイベントはありません。
          </p>
          <Button variant="ghost" size="sm" @click="reloadAll">
            再読込
          </Button>
        </div>

        <section
          v-else-if="otherEvents.length > 0"
          class="flex flex-col gap-hq-3"
          data-testid="home-other-events"
        >
          <Kicker>— 他のイベント · {{ otherEvents.length }}</Kicker>
          <div class="flex flex-col gap-hq-2">
            <EventRow
              v-for="event in otherEvents"
              :key="event.id"
              :event="event"
              :reservation-id="mineByEventId.get(event.id) ?? null"
            />
          </div>
        </section>
      </template>
    </section>
  </main>
</template>
