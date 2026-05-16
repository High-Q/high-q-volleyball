<script setup lang="ts">
import { onMounted, ref, useTemplateRef } from "vue";
import { RouterLink, useRouter } from "vue-router";
import { MembersListWidget } from "@/widgets/members-list";
import { MemberDetailSheet } from "@/widgets/member-detail-sheet";
import { PageBreadcrumb } from "@/widgets/page-breadcrumb";
import { useAuthSession } from "@/features/auth";
import {
  PendingCountBadge,
  usePendingCount,
} from "@/features/identity-document-pending-badge";
import { fetchMembersSummary, type MemberSummary } from "@/entities/member";

/**
 * /members のルートエントリページ。
 *
 * 関連:
 *   openspec/changes/admin-members-list-screen/specs/admin-members-list/spec.md
 *   openspec/changes/admin-members-list-screen/design.md
 */

const router = useRouter();
const session = useAuthSession();
const { count: pendingCount } = usePendingCount();

const summary = ref<MemberSummary | null>(null);
const listRef = useTemplateRef<{
  patchAdminNote: (memberId: string, next: string | null) => void;
  refetch: () => Promise<void>;
}>("listRef");

async function loadSummary(): Promise<void> {
  const result = await fetchMembersSummary();
  if (result.ok) summary.value = result.value;
}

onMounted(() => {
  void loadSummary();
});

async function onSignOut(): Promise<void> {
  await session.signOut();
  await router.replace({ name: "login" });
}

function onMemoSaved(memberId: string, note: string | null): void {
  // 楽観的更新を一覧の admin_note プレビューにも伝搬する。
  listRef.value?.patchAdminNote(memberId, note);
}

function onMemberWithdrawn(): void {
  // 削除後に一覧 + summary を refetch。当該行は消える。
  void listRef.value?.refetch();
  void loadSummary();
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
            { label: 'Workspace', to: { name: 'events' } },
            { label: '会員' },
          ]"
        />
        <h1 class="font-jp-display text-lg text-ink">会員</h1>
        <p
          v-if="summary"
          class="mt-hq-1 font-mono text-xs uppercase tracking-widest text-muted"
        >
          累計 {{ summary.total }} 名 · 今月初参加 {{ summary.first_this_month }} 名
        </p>
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
      <MembersListWidget ref="listRef" />
    </div>

    <MemberDetailSheet @saved="onMemoSaved" @withdrawn="onMemberWithdrawn" />
  </main>
</template>
