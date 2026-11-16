<script setup lang="ts">
import { computed } from "vue";
import type { MemberId } from "@high-q/shared";
import { useAuthSession } from "@/features/auth";
import { RegistrationToggleCard } from "@/features/registration-toggle";
import { PageBreadcrumb } from "@/widgets/page-breadcrumb";

/**
 * /settings — 運営設定ページ（member-registration-toggle）。
 *
 * サークル運営のグローバル設定をまとめる画面。現状は「新規会員登録の受付可否」
 * トグルのみ。更新者 (updated_by) として session.user.id (auth.uid()) を渡す。
 *
 * 関連:
 *   openspec/changes/member-registration-toggle/specs/admin-operational-settings/spec.md
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
          { label: '運営設定' },
        ]"
      />
      <h1 class="font-jp-display text-lg text-ink">運営設定</h1>
      <p class="mt-hq-1 font-jp text-xs text-muted">
        サークル運営に関わる全体設定です。育児休暇などで運営を離れる間は、新規会員登録の受付を停止できます。
      </p>
    </header>

    <div class="flex flex-1 flex-col gap-hq-6 px-hq-6 py-hq-6 md:px-hq-8">
      <RegistrationToggleCard :admin-member-id="adminMemberId" />
    </div>
  </div>
</template>
