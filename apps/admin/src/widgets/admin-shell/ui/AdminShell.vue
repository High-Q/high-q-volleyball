<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute } from "vue-router";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/shared/ui";
import SidebarNavContent from "./SidebarNavContent.vue";
import ShellIcon from "./ShellIcon.vue";

/**
 * admin の共通レイアウトシェル。
 *  - デスクトップ (≥ md): 240px 左固定サイドバー
 *  - モバイル (< md): 上部 AppBar (ハンバーガー + タイトル + 主要アクション領域) + ドロワー
 *
 * 画面タイトルは `route.meta.title` から取得する。モバイル主要アクションは
 * AppBar 右の Teleport ターゲット (`#admin-appbar-action`) へ各ページが流し込む。
 * ページ本文はデフォルトスロットで受ける。
 *
 * 関連:
 *   openspec/changes/admin-mobile-responsive/specs/admin-responsive-shell/spec.md
 *   openspec/changes/admin-mobile-responsive/design.md (D1, D2)
 */
const route = useRoute();
const title = computed<string>(
  () => (route.meta.title as string | undefined) ?? "",
);

const drawerOpen = ref(false);
</script>

<template>
  <div class="flex min-h-screen bg-paper">
    <!-- desktop sidebar -->
    <aside
      class="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-hairline md:flex"
    >
      <SidebarNavContent />
    </aside>

    <div class="flex min-w-0 flex-1 flex-col">
      <!-- mobile app bar -->
      <header
        class="flex items-center gap-hq-3 border-b border-hairline bg-paper px-hq-4 py-hq-2 md:hidden"
      >
        <Sheet v-model:open="drawerOpen">
          <SheetTrigger
            class="flex h-11 w-11 items-center justify-center rounded-hq-sm text-ink transition-colors hover:bg-paper-warm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
            aria-label="メニューを開く"
          >
            <ShellIcon name="menu" :size="22" />
          </SheetTrigger>
          <SheetContent side="left" class="p-0">
            <SheetTitle class="sr-only">メニュー</SheetTitle>
            <SheetDescription class="sr-only"
              >管理画面のナビゲーションメニュー</SheetDescription
            >
            <SidebarNavContent @navigate="drawerOpen = false" />
          </SheetContent>
        </Sheet>

        <span class="truncate font-jp text-base font-medium text-ink">{{
          title
        }}</span>

        <!-- ページ固有の主要アクションを各ページがここへ Teleport する -->
        <div id="admin-appbar-action" class="ml-auto flex items-center" />
      </header>

      <main class="min-w-0 flex-1">
        <slot />
      </main>
    </div>
  </div>
</template>
