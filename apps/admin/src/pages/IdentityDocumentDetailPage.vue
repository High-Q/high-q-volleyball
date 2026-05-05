<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import type { MemberId } from "@high-q/shared";
import { IdentityDocumentDetailWidget } from "@/widgets/identity-document-detail";
import { PageBreadcrumb } from "@/widgets/page-breadcrumb";
import { useAuthSession } from "@/features/auth";

/**
 * /identity-documents/:id のルートエントリページ。
 *
 * adminMemberId は session.user.id (auth.uid()) から取得し、widget に渡す。
 * 各 mutation (approve / reject / mask-delete) で reviewed_by として記録される。
 *
 * 関連:
 *   openspec/changes/admin-identity-document-review/specs/admin-identity-document-review/spec.md
 *     (Requirement: `/identity-documents/:id` 画面のルートと配置)
 */

const router = useRouter();
const session = useAuthSession();

const adminMemberId = computed<MemberId | null>(() => {
  const uid = session.session.value?.user.id;
  return uid ? (uid as MemberId) : null;
});

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
            { label: 'Workspace', to: { name: 'events' } },
            {
              label: 'Identity Documents',
              to: { name: 'identity-documents' },
            },
            { label: '詳細' },
          ]"
        />
        <h1 class="font-jp-display text-lg text-ink">書類詳細</h1>
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
      <IdentityDocumentDetailWidget
        v-if="adminMemberId"
        :admin-member-id="adminMemberId"
      />
      <div
        v-else
        role="alert"
        class="flex h-full items-center justify-center px-hq-8 py-hq-12 text-center"
      >
        <p class="font-jp text-base text-danger">
          認証情報を取得できませんでした。再ログインしてください。
        </p>
      </div>
    </div>
  </main>
</template>
