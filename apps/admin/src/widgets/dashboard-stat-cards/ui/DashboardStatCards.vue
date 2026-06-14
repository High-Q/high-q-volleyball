<script setup lang="ts">
import StatCard from "@/shared/ui/StatCard.vue";
import DashboardErrorState from "@/shared/ui/DashboardErrorState.vue";
import Skeleton from "@/shared/ui/Skeleton.vue";
import { useDashboardStats } from "@/features/dashboard-stats";

/**
 * StatCard 4 枚を 1 グリッドで描画する widget (#149)。
 *
 * 4 状態:
 *   - Loading: skeleton 4 枚
 *   - Error:   role="alert" + 再試行 (widget 単位)
 *   - Success: StatCard 4 枚
 *   (Empty は値 0 表示で吸収するため独立状態を持たない)
 *
 * 関連: openspec/changes/admin-dashboard-screen/specs/admin-dashboard/spec.md
 */

const { vms, loading, error, refetch } = useDashboardStats();
</script>

<template>
  <div>
    <!-- Loading -->
    <div
      v-if="loading"
      class="grid grid-cols-1 gap-hq-3 sm:grid-cols-2 lg:grid-cols-4"
      aria-busy="true"
    >
      <Skeleton v-for="n in 4" :key="n" class="h-28 rounded-hq-md" />
    </div>

    <!-- Error -->
    <DashboardErrorState
      v-else-if="error"
      :code="error.code"
      source="admin_dashboard_view"
      message="集計値を読み込めませんでした。"
      @retry="refetch"
    />

    <!-- Success -->
    <div v-else class="grid grid-cols-1 gap-hq-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        v-for="card in vms"
        :key="card.kicker"
        :kicker="card.kicker"
        :label="card.label"
        :value="card.value"
        :unit="card.unit"
        :delta="card.delta"
        :delta-tone="card.deltaTone"
        :sub="card.sub"
        :accent="card.accent"
      />
    </div>
  </div>
</template>
