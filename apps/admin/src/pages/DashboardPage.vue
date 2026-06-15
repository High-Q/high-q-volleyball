<script setup lang="ts">
import { RouterLink, useRouter } from "vue-router";
import { Button } from "@high-q/ui";
import { PageBreadcrumb } from "@/widgets/page-breadcrumb";
import { DashboardStatCards } from "@/widgets/dashboard-stat-cards";
import { DashboardUpcomingEvents } from "@/widgets/dashboard-upcoming-events";
import { DashboardNotifications } from "@/widgets/dashboard-notifications";
import { DashboardRecentBookings } from "@/widgets/dashboard-recent-bookings";
import { useAuthSession } from "@/features/auth";
import {
  PendingCountBadge,
  usePendingCount,
} from "@/features/identity-document-pending-badge";

/**
 * admin の `/` ダッシュボードページ (#149)。
 *
 * 概況サマリ (StatCard 4 / 直近イベント / 通知 / 最近の予約) を表示する admin の
 * 着地画面。横遷移リンク群 (会員 / 本人確認書類 / ログアウト) は EventsListPage と
 * 同じ動線を揃える。主 CTA「新しいイベントを作る」を header 右に配置。
 *
 * header は widget 群の Error 状態とは独立に描画され、widget が Error でも
 * ログアウト等は常に機能する。
 *
 * 関連:
 *   openspec/changes/admin-dashboard-screen/specs/admin-dashboard/spec.md
 *   openspec/changes/admin-dashboard-screen/design.md (D5, D6)
 */

const router = useRouter();
const session = useAuthSession();
const { count: pendingCount } = usePendingCount();

async function onSignOut(): Promise<void> {
  await session.signOut();
  await router.replace({ name: "login" });
}
</script>

<template>
  <main class="flex min-h-screen flex-col bg-paper text-ink font-jp">
    <header
      class="flex items-center justify-between border-b border-hairline bg-paper px-hq-8 py-hq-3"
    >
      <div>
        <PageBreadcrumb
          :items="[
            { label: 'Workspace', to: { name: 'dashboard' } },
            { label: 'ダッシュボード' },
          ]"
        />
        <h1 class="font-jp-display text-lg text-ink">ダッシュボード</h1>
      </div>
      <div class="flex items-center gap-hq-4">
        <RouterLink
          :to="{ name: 'members' }"
          class="inline-flex items-center gap-hq-2 rounded-hq-sm border border-hairline bg-paper px-hq-3 py-hq-1 font-jp text-sm text-ink transition-colors hover:bg-paper-warm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
          aria-label="会員の一覧"
        >
          <span>会員</span>
        </RouterLink>
        <RouterLink
          :to="{ name: 'identity-documents' }"
          class="inline-flex items-center gap-hq-2 rounded-hq-sm border border-hairline bg-paper px-hq-3 py-hq-1 font-jp text-sm text-ink transition-colors hover:bg-paper-warm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
          aria-label="本人確認書類の一覧"
        >
          <span>本人確認書類</span>
          <PendingCountBadge :count="pendingCount" />
        </RouterLink>
        <RouterLink :to="{ name: 'events-new' }">
          <Button variant="primary" size="sm">新しいイベントを作る</Button>
        </RouterLink>
        <button
          type="button"
          class="font-jp text-sm text-muted hover:text-ink"
          @click="onSignOut"
        >
          ログアウト
        </button>
      </div>
    </header>

    <div class="flex-1 overflow-auto">
      <div class="mx-auto flex max-w-6xl flex-col gap-hq-4 px-hq-8 py-hq-6">
        <DashboardStatCards />
        <div class="grid grid-cols-1 gap-hq-4 lg:grid-cols-[1fr_22rem]">
          <DashboardUpcomingEvents />
          <div class="flex flex-col gap-hq-4">
            <DashboardNotifications />
            <DashboardRecentBookings />
          </div>
        </div>
      </div>
    </div>
  </main>
</template>
