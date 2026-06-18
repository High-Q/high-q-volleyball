<script setup lang="ts">
import { EventsListWidget } from "@/widgets/events-list";
import { PageBreadcrumb } from "@/widgets/page-breadcrumb";

/**
 * /events のルートエントリページ。
 *
 * #155 グローバルナビ (会場 / 会員 / 本人確認書類 / ログアウト) は共通シェル
 * (admin-shell) のサイドバー / ドロワーへ移設したため、ページ header は
 * パンくず + タイトルのみに縮約。
 *
 * 関連:
 *   openspec/changes/admin-events-list-screen/specs/admin-events-list/spec.md
 *   openspec/changes/admin-mobile-responsive/specs/admin-events-list/spec.md
 */
</script>

<template>
  <div class="flex h-screen flex-col bg-paper text-ink font-jp">
    <header class="border-b border-hairline bg-paper px-hq-6 py-hq-3 md:px-hq-8">
      <PageBreadcrumb
        :items="[
          { label: 'Workspace', to: { name: 'dashboard' } },
          { label: 'Events' },
        ]"
      />
      <h1 class="font-jp-display text-lg text-ink">イベント</h1>
    </header>

    <div class="flex-1 overflow-hidden">
      <EventsListWidget />
    </div>
  </div>
</template>
