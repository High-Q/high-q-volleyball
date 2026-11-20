<script setup lang="ts">
import { computed } from "vue";
import type { MemberId } from "@high-q/shared";
import { useAuthSession } from "@/features/auth";
import { AnnouncementsMasterDetail } from "@/widgets/announcements-master-detail";
import { PageBreadcrumb } from "@/widgets/page-breadcrumb";

/**
 * /announcements — お知らせ管理ページ（general-announcements / #395）。
 *
 * サイト内に掲示する汎用お知らせの作成・編集・削除。作成者 (created_by) として
 * session.user.id (auth.uid()) を渡す。
 *
 * 関連:
 *   openspec/changes/general-announcements/specs/admin-announcements/spec.md
 */

const session = useAuthSession();

const adminMemberId = computed<MemberId | null>(() => {
  const uid = session.session.value?.user.id;
  return uid ? (uid as MemberId) : null;
});
</script>

<template>
  <div class="flex min-h-full flex-col bg-paper text-ink font-jp">
    <header class="border-b border-hairline bg-paper px-hq-6 py-hq-3 md:px-hq-8">
      <PageBreadcrumb
        :items="[
          { label: 'Workspace', to: { name: 'dashboard' } },
          { label: 'お知らせ' },
        ]"
      />
      <h1 class="font-jp-display text-lg text-ink">お知らせ</h1>
      <p class="mt-hq-1 font-jp text-xs text-muted">
        LP（公開サイト）と予約サイト（会員向け）に掲示するお知らせを管理します。掲載期間を設定すると、期間内だけ自動で表示されます。
      </p>
    </header>

    <div class="flex flex-1 flex-col px-hq-6 py-hq-6 md:px-hq-8">
      <AnnouncementsMasterDetail :admin-member-id="adminMemberId" />
    </div>
  </div>
</template>
