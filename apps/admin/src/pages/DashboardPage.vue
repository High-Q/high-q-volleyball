<script setup lang="ts">
import { RouterLink } from "vue-router";
import { Button } from "@high-q/ui";
import { PageBreadcrumb } from "@/widgets/page-breadcrumb";
import { DashboardStatCards } from "@/widgets/dashboard-stat-cards";
import { DashboardUpcomingEvents } from "@/widgets/dashboard-upcoming-events";
import { DashboardNotifications } from "@/widgets/dashboard-notifications";
import { DashboardRecentBookings } from "@/widgets/dashboard-recent-bookings";
import { AppBarAction } from "@/widgets/admin-shell";

/**
 * admin の `/` ダッシュボードページ (#149)。
 *
 * 概況サマリ (StatCard 4 / 直近イベント / 通知 / 最近の予約) を表示する admin の
 * 着地画面。グローバルナビ (会員 / 本人確認書類 / 会場 / ログアウト) は #155 で共通
 * シェル (admin-shell) のサイドバー / ドロワーへ移設したため、ページ header は
 * パンくず + タイトル + 主 CTA のみに縮約。
 *
 * 主 CTA「新しいイベントを作る」はデスクトップでは header 右、モバイルでは AppBar 右へ
 * Teleport する。本文 2 カラムは md 未満で縦積み。
 *
 * 関連:
 *   openspec/changes/admin-dashboard-screen/specs/admin-dashboard/spec.md
 *   openspec/changes/admin-mobile-responsive/specs/admin-dashboard/spec.md
 */
</script>

<template>
  <div class="flex min-h-full flex-1 flex-col bg-paper text-ink font-jp">
    <header
      class="flex items-center justify-between border-b border-hairline bg-paper px-hq-6 py-hq-3 md:px-hq-8"
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
      <!-- 主 CTA: デスクトップは header 右 (モバイルは AppBar へ Teleport) -->
      <RouterLink :to="{ name: 'events-new' }" class="hidden md:inline-flex">
        <Button variant="primary" size="sm">新しいイベントを作る</Button>
      </RouterLink>
    </header>

    <!-- モバイル AppBar 右の主要アクション -->
    <AppBarAction>
      <RouterLink :to="{ name: 'events-new' }" aria-label="新しいイベントを作る">
        <Button variant="primary" size="sm">新規</Button>
      </RouterLink>
    </AppBarAction>

    <div class="flex-1 overflow-auto">
      <div
        class="mx-auto flex max-w-6xl flex-col gap-hq-4 px-hq-6 py-hq-6 md:px-hq-8"
      >
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
  </div>
</template>
