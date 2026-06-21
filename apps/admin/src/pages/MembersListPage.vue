<script setup lang="ts">
import { onMounted, ref, useTemplateRef } from "vue";
import { MembersListWidget } from "@/widgets/members-list";
import { MemberDetailSheet } from "@/widgets/member-detail-sheet";
import { PageBreadcrumb } from "@/widgets/page-breadcrumb";
import { fetchMembersSummary, type MemberSummary } from "@/entities/member";

/**
 * /members のルートエントリページ。
 *
 * #155 グローバルナビ (イベント / 本人確認書類 / ログアウト) は共通シェル
 * (admin-shell) へ移設したため、ページ header はパンくず + タイトル + サマリのみ。
 *
 * 関連:
 *   openspec/changes/admin-members-list-screen/specs/admin-members-list/spec.md
 *   openspec/changes/admin-mobile-responsive/specs/admin-members-list/spec.md
 */

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
  <div class="flex h-screen flex-col bg-paper text-ink font-jp">
    <header class="border-b border-hairline bg-paper px-hq-6 py-hq-3 md:px-hq-8">
      <PageBreadcrumb
        :items="[
          { label: 'Workspace', to: { name: 'dashboard' } },
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
    </header>

    <div class="flex-1 overflow-hidden">
      <MembersListWidget ref="listRef" />
    </div>

    <MemberDetailSheet @saved="onMemoSaved" @withdrawn="onMemberWithdrawn" />
  </div>
</template>
