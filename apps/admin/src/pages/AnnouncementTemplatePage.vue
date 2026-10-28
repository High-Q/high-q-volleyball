<script setup lang="ts">
import { computed } from "vue";
import type { MemberId } from "@high-q/shared";
import { useAuthSession } from "@/features/auth";
import { AnnouncementTemplateForm } from "@/features/announcement-template-edit";
import { PageBreadcrumb } from "@/widgets/page-breadcrumb";

/**
 * /announcement-template — LINE 告知テンプレート編集ページ (#386)。
 *
 * テンプレートは LINE 用 1 つのため一覧は持たず編集フォームのみ。
 * 保存者 (updated_by) として session.user.id (auth.uid()) をフォームに渡す。
 *
 * 関連:
 *   openspec/changes/line-announcement-copy/specs/admin-line-announcement/spec.md
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
          { label: '告知テンプレート' },
        ]"
      />
      <h1 class="font-jp-display text-lg text-ink">告知テンプレート</h1>
      <p class="mt-hq-1 font-jp text-xs text-muted">
        イベント詳細の「告知文をコピー」で使う LINE 告知文のひな形です。
      </p>
    </header>

    <div class="flex-1 px-hq-6 py-hq-6 md:px-hq-8">
      <AnnouncementTemplateForm :admin-member-id="adminMemberId" />
    </div>
  </div>
</template>
