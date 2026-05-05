<script setup lang="ts">
import { RouterLink, useRouter } from "vue-router";
import { EventsListWidget } from "@/widgets/events-list";
import { PageBreadcrumb } from "@/widgets/page-breadcrumb";
import { useAuthSession } from "@/features/auth";
import {
  PendingCountBadge,
  usePendingCount,
} from "@/features/identity-document-pending-badge";

/**
 * /events のルートエントリページ。
 *
 * #171 で本人確認書類リンク + pending 件数 Badge を header に追加 (admin の
 * 既定トップ画面のためダッシュボード相当のサマリ機能を兼ねる)。
 *
 * 関連:
 *   openspec/changes/admin-events-list-screen/specs/admin-events-list/spec.md
 *   openspec/changes/admin-identity-document-review/specs/admin-identity-document-review/spec.md
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
  <main class="flex h-screen flex-col bg-paper text-ink font-jp">
    <header
      class="flex items-center justify-between border-b border-hairline bg-paper px-hq-8 py-hq-3"
    >
      <div>
        <PageBreadcrumb
          :items="[
            { label: 'Workspace' },
            { label: 'Events' },
          ]"
        />
        <h1 class="font-jp-display text-lg text-ink">イベント</h1>
      </div>
      <div class="flex items-center gap-hq-4">
        <RouterLink
          :to="{ name: 'identity-documents' }"
          class="inline-flex items-center gap-hq-2 rounded-hq-sm border border-hairline bg-paper px-hq-3 py-hq-1 font-jp text-sm text-ink transition-colors hover:bg-paper-warm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
          aria-label="本人確認書類の一覧"
        >
          <span>本人確認書類</span>
          <PendingCountBadge :count="pendingCount" />
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

    <div class="flex-1 overflow-hidden">
      <EventsListWidget />
    </div>
  </main>
</template>
