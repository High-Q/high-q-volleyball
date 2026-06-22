<script setup lang="ts">
import { ref } from "vue";
import { Button } from "@high-q/ui";
import { VenuesMasterDetail } from "@/widgets/venues-master-detail";
import { PageBreadcrumb } from "@/widgets/page-breadcrumb";
import { AppBarAction } from "@/widgets/admin-shell";

/**
 * /venues — 会場マスタ（マスター・ディテール型）ページ。
 *
 * #155 グローバルナビ (イベント / 会員 / 本人確認書類 / ログアウト) は共通シェル
 * (admin-shell) へ移設。主 CTA「＋ 新しい会場」はデスクトップは header 右、
 * モバイルは AppBar 右へ Teleport する。
 *
 * 関連:
 *   openspec/changes/admin-venues-crud-screen/specs/admin-venues-crud/spec.md
 *   openspec/changes/admin-mobile-responsive/specs/admin-venues-crud/spec.md
 */

const board = ref<InstanceType<typeof VenuesMasterDetail> | null>(null);

function onNew(): void {
  board.value?.addVenue();
}
</script>

<template>
  <div class="flex min-h-screen flex-col bg-paper text-ink font-jp md:h-screen">
    <header
      class="flex items-center justify-between border-b border-hairline bg-paper px-hq-6 py-hq-3 md:px-hq-8"
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
      <!-- 主 CTA: デスクトップは header 右 (モバイルは AppBar へ Teleport) -->
      <Button
        class="hidden md:inline-flex"
        variant="primary"
        size="sm"
        @click="onNew"
        >＋ 新しい会場</Button
      >
    </header>

    <AppBarAction>
      <Button variant="primary" size="sm" aria-label="新しい会場" @click="onNew"
        >＋ 会場</Button
      >
    </AppBarAction>

    <div class="flex-1 px-hq-6 py-hq-6 md:overflow-hidden md:px-hq-8">
      <VenuesMasterDetail ref="board" />
    </div>
  </div>
</template>
