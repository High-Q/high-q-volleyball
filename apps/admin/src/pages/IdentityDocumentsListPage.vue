<script setup lang="ts">
import { useRouter } from "vue-router";
import { IdentityDocumentsListWidget } from "@/widgets/identity-documents-list";
import { PageBreadcrumb } from "@/widgets/page-breadcrumb";
import { useAuthSession } from "@/features/auth";

/**
 * /identity-documents のルートエントリページ。
 *
 * 関連:
 *   openspec/changes/admin-identity-document-review/specs/admin-identity-document-review/spec.md
 *     (Requirement: `/identity-documents` 画面のルートと配置)
 */

const router = useRouter();
const session = useAuthSession();

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
            { label: 'Identity Documents' },
          ]"
        />
        <h1 class="font-jp-display text-lg text-ink">本人確認書類</h1>
      </div>
      <button
        type="button"
        class="font-jp text-sm text-muted hover:text-ink"
        @click="onSignOut"
      >
        ログアウト
      </button>
    </header>

    <div class="flex-1 overflow-hidden">
      <IdentityDocumentsListWidget />
    </div>
  </main>
</template>
