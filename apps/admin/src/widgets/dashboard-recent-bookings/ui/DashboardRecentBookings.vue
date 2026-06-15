<script setup lang="ts">
import { computed } from "vue";
import DashboardCard from "@/shared/ui/DashboardCard.vue";
import DashboardErrorState from "@/shared/ui/DashboardErrorState.vue";
import Skeleton from "@/shared/ui/Skeleton.vue";
import { formatRelativeTime } from "@/features/dashboard-stats";
import {
  getDashboardRecentBookings,
  type DashboardRecentBookingRow,
} from "@/entities/dashboard";
import { useAsyncResource } from "@/shared/lib/useAsyncResource";

/**
 * 最近の予約 4 件 widget (#149)。
 *
 * admin_dashboard_recent_bookings_view から取得 (cancelled / 匿名化済みは
 * view 側で除外済み)。頭文字円 + 氏名 + イベント名 + 経過時間で表示。
 *
 * 関連: openspec/changes/admin-dashboard-screen/specs/admin-dashboard/spec.md
 */

const { data, loading, error, refetch } = useAsyncResource(
  getDashboardRecentBookings,
);

const rows = computed<DashboardRecentBookingRow[]>(() => data.value ?? []);
const isEmpty = computed(
  () => !loading.value && !error.value && rows.value.length === 0,
);
</script>

<template>
  <DashboardCard kicker="Recent bookings" title="最近の予約">
    <!-- Loading -->
    <div v-if="loading" class="flex flex-col gap-hq-2" aria-busy="true">
      <Skeleton v-for="n in 4" :key="n" class="h-9" />
    </div>

    <!-- Error -->
    <DashboardErrorState
      v-else-if="error"
      :code="error.code"
      source="admin_dashboard_recent_bookings_view"
      message="最近の予約を読み込めませんでした。"
      @retry="refetch"
    />

    <!-- Empty -->
    <p
      v-else-if="isEmpty"
      class="py-hq-6 text-center font-jp text-sm text-muted"
    >
      予約はまだありません
    </p>

    <!-- Success -->
    <ul v-else class="flex flex-col">
      <li
        v-for="(b, i) in rows"
        :key="b.reservation_id"
        :class="[
          'flex items-center gap-hq-3 py-hq-2',
          i === 0 ? '' : 'border-t border-hairline-soft',
        ]"
      >
        <span
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded-hq-pill border border-hairline bg-paper-warm font-jp text-xs text-ink"
          aria-hidden="true"
        >
          {{ b.member_initial }}
        </span>
        <div class="min-w-0 flex-1">
          <div class="truncate font-jp text-sm text-ink">
            {{ b.member_display_name }}
          </div>
          <div class="truncate font-jp text-xs text-muted">{{ b.event_name }}</div>
        </div>
        <time
          :datetime="b.created_at"
          class="shrink-0 font-mono text-xs text-muted"
        >
          {{ formatRelativeTime(b.created_at) }}
        </time>
      </li>
    </ul>
  </DashboardCard>
</template>
