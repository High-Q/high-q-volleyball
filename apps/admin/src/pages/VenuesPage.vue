<script setup lang="ts">
import { ref } from "vue";
import { RouterLink, useRouter } from "vue-router";
import { Button } from "@high-q/ui";
import { VenuesMasterDetail } from "@/widgets/venues-master-detail";
import { PageBreadcrumb } from "@/widgets/page-breadcrumb";
import { useAuthSession } from "@/features/auth";
import {
  PendingCountBadge,
  usePendingCount,
} from "@/features/identity-document-pending-badge";

/**
 * /venues — 会場マスタ（マスター・ディテール型）ページ。
 *
 * ヘッダーは EventsListPage / DashboardPage と同じ横遷移リンク動線を揃える
 * （双方向対称）。主 CTA「＋ 新しい会場」は widget の addVenue を呼ぶ。
 *
 * 関連:
 *   openspec/changes/admin-venues-crud-screen/specs/admin-venues-crud/spec.md
 */

const router = useRouter();
const session = useAuthSession();
const { count: pendingCount } = usePendingCount();

const board = ref<InstanceType<typeof VenuesMasterDetail> | null>(null);

function onNew(): void {
  board.value?.addVenue();
}

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
            { label: 'Workspace', to: { name: 'dashboard' } },
            { label: '会場' },
          ]"
        />
        <h1 class="font-jp-display text-lg text-ink">会場マスタ</h1>
      </div>
      <div class="flex items-center gap-hq-4">
        <RouterLink
          :to="{ name: 'events' }"
          class="inline-flex items-center gap-hq-2 rounded-hq-sm border border-hairline bg-paper px-hq-3 py-hq-1 font-jp text-sm text-ink transition-colors hover:bg-paper-warm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
          aria-label="イベントの一覧"
        >
          <span>イベント</span>
        </RouterLink>
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
        <Button variant="primary" size="sm" @click="onNew">＋ 新しい会場</Button>
        <button
          type="button"
          class="font-jp text-sm text-muted hover:text-ink"
          @click="onSignOut"
        >
          ログアウト
        </button>
      </div>
    </header>

    <div class="flex-1 overflow-hidden px-hq-8 py-hq-6">
      <VenuesMasterDetail ref="board" />
    </div>
  </main>
</template>
