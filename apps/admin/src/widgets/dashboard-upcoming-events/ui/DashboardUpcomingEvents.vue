<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";
import { Button, RemainBar } from "@high-q/ui";
import DashboardCard from "@/shared/ui/DashboardCard.vue";
import DashboardErrorState from "@/shared/ui/DashboardErrorState.vue";
import Skeleton from "@/shared/ui/Skeleton.vue";
import { shortenVenueName } from "@/entities/venue";
import {
  getDashboardUpcomingEvents,
  type DashboardUpcomingEventRow,
} from "@/entities/dashboard";
import { useAsyncResource } from "@/shared/lib/useAsyncResource";

/**
 * 直近イベント 3 件 widget (#149)。
 *
 * event_list_view から開催予定 published を 3 件取得し、残席バー付きで表示。
 * 行クリックで /events/:id へ遷移。「全件を見る」で /events へ。
 *
 * 関連: openspec/changes/admin-dashboard-screen/specs/admin-dashboard/spec.md
 */

const { data, loading, error, refetch } = useAsyncResource(
  getDashboardUpcomingEvents,
);

const rows = computed<DashboardUpcomingEventRow[]>(() => data.value ?? []);
const isEmpty = computed(() => !loading.value && !error.value && rows.value.length === 0);

function dateParts(iso: string): { date: string; dow: string } {
  const d = new Date(iso);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const dow = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()] ?? "";
  return { date: `${mm}/${dd}`, dow };
}

function timeRange(startIso: string, endIso: string): string {
  const fmt = (iso: string) => {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };
  return `${fmt(startIso)} – ${fmt(endIso)}`;
}
</script>

<template>
  <DashboardCard kicker="Next up" title="直近のイベント">
    <template #action>
      <RouterLink
        :to="{ name: 'events' }"
        class="font-jp text-xs text-accent hover:underline"
      >
        全件を見る ›
      </RouterLink>
    </template>

    <!-- Loading -->
    <div v-if="loading" class="flex flex-col gap-hq-3" aria-busy="true">
      <Skeleton v-for="n in 3" :key="n" class="h-12" />
    </div>

    <!-- Error -->
    <DashboardErrorState
      v-else-if="error"
      :code="error.code"
      source="event_list_view"
      message="直近のイベントを読み込めませんでした。"
      @retry="refetch"
    />

    <!-- Empty -->
    <div
      v-else-if="isEmpty"
      class="flex flex-col items-center gap-hq-3 py-hq-8 text-center"
    >
      <p class="font-jp text-sm text-muted">予定されたイベントはありません</p>
      <RouterLink :to="{ name: 'events-new' }">
        <Button variant="primary" size="sm">新しいイベントを作る</Button>
      </RouterLink>
    </div>

    <!-- Success -->
    <ul v-else class="flex flex-col">
      <li
        v-for="(e, i) in rows"
        :key="e.id"
        :class="['border-hairline-soft', i === 0 ? '' : 'border-t']"
      >
        <RouterLink
          :to="{ name: 'events-detail', params: { id: e.id } }"
          class="grid grid-cols-[3rem_1fr] items-center gap-hq-4 rounded-hq-sm px-hq-2 py-hq-3 transition-colors hover:bg-paper-warm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent sm:grid-cols-[3rem_1fr_12rem]"
        >
          <div class="text-center">
            <div class="font-mono text-sm text-ink">{{ dateParts(e.start_at).date }}</div>
            <div class="font-mono text-xs uppercase tracking-widest text-muted">
              {{ dateParts(e.start_at).dow }}
            </div>
          </div>
          <div class="min-w-0">
            <div class="truncate font-jp text-sm text-ink" :title="e.name">
              {{ e.name }}
            </div>
            <div class="truncate font-jp text-xs text-muted">
              {{ shortenVenueName(e.venue_name ?? "") }} ·
              {{ timeRange(e.start_at, e.end_at) }}
            </div>
          </div>
          <div class="hidden sm:block">
            <RemainBar
              v-if="e.capacity !== null"
              :capacity="e.capacity"
              :taken="e.reserved_count"
            />
            <span v-else class="font-jp text-xs text-muted">
              {{ e.reserved_count }} 件
            </span>
          </div>
        </RouterLink>
      </li>
    </ul>
  </DashboardCard>
</template>
