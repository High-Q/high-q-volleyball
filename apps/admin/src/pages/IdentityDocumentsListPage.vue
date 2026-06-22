<script setup lang="ts">
import { IdentityDocumentsListWidget } from "@/widgets/identity-documents-list";
import { PageBreadcrumb } from "@/widgets/page-breadcrumb";

/**
 * /identity-documents のルートエントリページ。
 *
 * #155 ログアウト等のグローバルナビは共通シェル (admin-shell) へ移設したため、
 * ページ header はパンくず + タイトルのみに縮約。
 *
 * 関連:
 *   openspec/changes/admin-identity-document-review/specs/admin-identity-document-review/spec.md
 *   openspec/changes/admin-mobile-responsive/specs/admin-identity-document-review/spec.md
 */
</script>

<template>
  <div class="flex min-h-screen flex-col bg-paper text-ink font-jp md:h-screen">
    <header class="border-b border-hairline bg-paper px-hq-6 py-hq-3 md:px-hq-8">
      <PageBreadcrumb
        :items="[
          { label: 'Workspace', to: { name: 'dashboard' } },
          { label: 'Identity Documents' },
        ]"
      />
      <h1 class="font-jp-display text-lg text-ink">本人確認書類</h1>
    </header>

    <div class="flex-1 md:overflow-hidden">
      <IdentityDocumentsListWidget />
    </div>
  </div>
</template>
