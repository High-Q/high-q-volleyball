<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import { Button, Kicker } from "@high-q/ui";
import { useAuthSession } from "@/features/auth";
import { EventCard, useUpcomingEvents } from "@/features/event-listing";
import { PageBreadcrumb } from "@/widgets/page-breadcrumb";

const router = useRouter();
const session = useAuthSession();
const { events, loading, error, reload } = useUpcomingEvents();

const count = computed(() => events.value.length);

async function onLogout(): Promise<void> {
  await session.signOut();
  void router.push({ name: "login" });
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
            { label: 'イベント' },
          ]"
        />
        <span class="font-jp-display text-lg text-ink mt-hq-1">High Q</span>
      </div>
      <Button variant="ghost" type="button" @click="onLogout">
        ログアウト
      </Button>
    </header>

    <section class="px-hq-5 py-hq-6">
      <Kicker>— Upcoming · {{ count }}</Kicker>
      <h1
        class="font-jp-display text-2xl font-medium text-ink leading-snug mt-hq-2 m-0"
      >
        次の練習を、<br />選んでください。
      </h1>
      <p class="font-jp text-xs text-muted mt-hq-2 m-0">
        ご予約は前日 12:00 まで。当日は会場で参加費をお支払いください。
      </p>
    </section>

    <section
      class="flex-1 px-hq-5 pb-hq-8 flex flex-col gap-hq-3"
      :aria-busy="loading"
    >
      <template v-if="loading">
        <div
          v-for="i in 3"
          :key="i"
          class="bg-surface border border-hairline rounded-hq-lg p-hq-5 h-24 animate-pulse"
          aria-label="読み込み中"
        />
      </template>

      <div
        v-else-if="error !== null"
        class="bg-surface border border-hairline rounded-hq-lg p-hq-5 flex flex-col gap-hq-3"
        role="alert"
      >
        <p class="font-jp text-sm text-ink m-0">
          イベント情報を取得できませんでした。
        </p>
        <Button variant="secondary" size="sm" @click="reload">
          再試行
        </Button>
      </div>

      <div
        v-else-if="count === 0"
        class="bg-surface border border-hairline rounded-hq-lg p-hq-5 flex flex-col gap-hq-3"
      >
        <p class="font-jp text-sm text-ink m-0">
          現在開催予定のイベントはありません。
        </p>
        <Button variant="ghost" size="sm" @click="reload">
          再読込
        </Button>
      </div>

      <EventCard v-else v-for="event in events" :key="event.id" :event="event" />
    </section>
  </main>
</template>
