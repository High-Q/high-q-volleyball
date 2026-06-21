<script setup lang="ts">
import { computed } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";
import { useAuthSession } from "@/features/auth";
import {
  PendingCountBadge,
  usePendingCount,
} from "@/features/identity-document-pending-badge";
import { ADMIN_NAV_ITEMS, isNavItemActive } from "../model/navItems";
import ShellIcon from "./ShellIcon.vue";

/**
 * サイドバー / ドロワー共通のナビ本体。ブランド + グローバルナビ項目
 * (実在ルートのみ) + 本人確認書類の pending Badge + ユーザー表示 + ログアウト。
 *
 * ナビ項目 / ログアウト押下時に `navigate` を emit する
 * (ドロワーはこれを受けて閉じる)。
 *
 * 関連:
 *   openspec/changes/admin-mobile-responsive/specs/admin-responsive-shell/spec.md
 */
const emit = defineEmits<{ navigate: [] }>();

const route = useRoute();
const router = useRouter();
const session = useAuthSession();
const { count: pendingCount } = usePendingCount();

const userEmail = computed<string>(
  () => session.session.value?.user?.email ?? "",
);
const userInitial = computed<string>(() =>
  userEmail.value ? userEmail.value.charAt(0).toUpperCase() : "?",
);

function onNavigate(): void {
  emit("navigate");
}

async function onSignOut(): Promise<void> {
  emit("navigate");
  await session.signOut();
  await router.replace({ name: "login" });
}
</script>

<template>
  <div class="flex h-full flex-col gap-hq-1 bg-paper-warm px-hq-3 py-hq-5">
    <!-- brand -->
    <div class="flex items-baseline gap-hq-2 px-hq-2 pb-hq-5">
      <span class="font-jp-display text-xl font-semibold tracking-wide text-ink"
        >High Q</span
      >
      <span class="font-mono text-[0.625rem] tracking-[0.2em] text-muted"
        >ADMIN</span
      >
    </div>

    <!-- nav items -->
    <nav aria-label="メインナビゲーション" class="flex flex-col gap-hq-1">
      <RouterLink
        v-for="item in ADMIN_NAV_ITEMS"
        :key="item.routeName"
        :to="{ name: item.routeName }"
        class="flex min-h-[44px] items-center gap-hq-3 rounded-hq-sm border border-transparent px-hq-2 py-hq-2 font-jp text-sm text-ink-soft transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
        :class="
          isNavItemActive(item, route.name as string | null | undefined)
            ? 'border-hairline bg-surface font-medium text-ink'
            : ''
        "
        :aria-current="
          isNavItemActive(item, route.name as string | null | undefined)
            ? 'page'
            : undefined
        "
        @click="onNavigate"
      >
        <span
          :class="
            isNavItemActive(item, route.name as string | null | undefined)
              ? 'text-accent'
              : 'text-muted'
          "
        >
          <ShellIcon :name="item.icon" :size="18" />
        </span>
        <span>{{ item.label }}</span>
        <span v-if="item.pendingBadge" class="ml-auto">
          <PendingCountBadge :count="pendingCount" />
        </span>
      </RouterLink>
    </nav>

    <div class="flex-1" />

    <!-- user + logout -->
    <div class="border-t border-hairline pt-hq-3">
      <div class="flex items-center gap-hq-2 px-hq-2 pb-hq-2">
        <span
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent font-jp text-xs font-semibold text-paper"
          aria-hidden="true"
          >{{ userInitial }}</span
        >
        <span
          class="min-w-0 truncate font-mono text-xs text-muted"
          :title="userEmail"
          >{{ userEmail }}</span
        >
      </div>
      <button
        type="button"
        class="flex min-h-[44px] w-full items-center gap-hq-3 rounded-hq-sm px-hq-2 py-hq-2 font-jp text-sm text-muted transition-colors hover:bg-surface hover:text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
        @click="onSignOut"
      >
        <ShellIcon name="logout" :size="18" />
        <span>ログアウト</span>
      </button>
    </div>
  </div>
</template>
