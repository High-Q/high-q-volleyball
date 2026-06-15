<script setup lang="ts">
import { computed } from "vue";
import DashboardCard from "@/shared/ui/DashboardCard.vue";
import DashboardErrorState from "@/shared/ui/DashboardErrorState.vue";
import Skeleton from "@/shared/ui/Skeleton.vue";
import { formatRelativeTime } from "@/features/dashboard-stats";
import {
  getDashboardNearFullEvents,
  getDashboardRecentCancellations,
  type DashboardNearFullEventRow,
  type DashboardRecentCancellationRow,
} from "@/entities/dashboard";
import { useAsyncResource } from "@/shared/lib/useAsyncResource";

/**
 * 通知パネル widget (#149)。
 *
 * 「満員直前イベント」「最近のキャンセル」の 2 集計のみを表示する。
 * メール送信失敗は Sentry 運用へ委譲し本 widget では扱わない。
 *
 * 関連: openspec/changes/admin-dashboard-screen/specs/admin-dashboard/spec.md
 */

const nearFull = useAsyncResource(getDashboardNearFullEvents);
const cancellations = useAsyncResource(getDashboardRecentCancellations);

const loading = computed(() => nearFull.loading.value || cancellations.loading.value);
const error = computed(() => nearFull.error.value ?? cancellations.error.value);

const nearFullRows = computed<DashboardNearFullEventRow[]>(
  () => nearFull.data.value ?? [],
);
const cancellationRows = computed<DashboardRecentCancellationRow[]>(
  () => cancellations.data.value ?? [],
);

const totalCount = computed(
  () => nearFullRows.value.length + cancellationRows.value.length,
);
const isEmpty = computed(
  () => !loading.value && !error.value && totalCount.value === 0,
);

function refetch(): void {
  void nearFull.refetch();
  void cancellations.refetch();
}

/** 残席 1 = danger / 残席 2 = warn。 */
function toneFor(remaining: number): "danger" | "warn" {
  return remaining <= 1 ? "danger" : "warn";
}
</script>

<template>
  <DashboardCard kicker="Notifications" title="通知">
    <template #action>
      <span
        v-if="!loading && !error"
        class="font-mono text-xs text-muted"
        aria-label="通知件数"
      >
        {{ totalCount }} 件
      </span>
    </template>

    <!-- Loading -->
    <div v-if="loading" class="flex flex-col gap-hq-2" aria-busy="true">
      <Skeleton v-for="n in 3" :key="n" class="h-8" />
    </div>

    <!-- Error -->
    <DashboardErrorState
      v-else-if="error"
      :code="error.code"
      source="notifications"
      message="通知を読み込めませんでした。"
      @retry="refetch"
    />

    <!-- Empty -->
    <p
      v-else-if="isEmpty"
      class="py-hq-6 text-center font-jp text-sm text-muted"
    >
      いまのところ何もありません
    </p>

    <!-- Success -->
    <div v-else class="flex flex-col gap-hq-4">
      <ul v-if="nearFullRows.length > 0" class="flex flex-col gap-hq-2">
        <li
          v-for="e in nearFullRows"
          :key="e.id"
          class="flex items-center gap-hq-2"
        >
          <span
            class="inline-block h-2 w-2 shrink-0 rounded-hq-pill"
            :class="toneFor(e.remaining) === 'danger' ? 'bg-danger' : 'bg-warn'"
            aria-hidden="true"
          />
          <span class="min-w-0 flex-1 truncate font-jp text-sm text-ink">
            満員直前: {{ e.name }} 残 {{ e.remaining }} 席
          </span>
        </li>
      </ul>

      <ul v-if="cancellationRows.length > 0" class="flex flex-col gap-hq-2">
        <li
          v-for="c in cancellationRows"
          :key="c.reservation_id"
          class="flex items-center gap-hq-2"
        >
          <span
            class="inline-block h-2 w-2 shrink-0 rounded-hq-pill bg-muted"
            aria-hidden="true"
          />
          <span class="min-w-0 flex-1 truncate font-jp text-sm text-ink">
            キャンセル: {{ c.member_display_name }} 様（{{ c.event_name }}）
          </span>
          <time
            :datetime="c.cancelled_at"
            class="shrink-0 font-mono text-xs text-muted"
          >
            {{ formatRelativeTime(c.cancelled_at) }}
          </time>
        </li>
      </ul>
    </div>
  </DashboardCard>
</template>
