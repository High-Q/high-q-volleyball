<script setup lang="ts">
import { computed } from "vue";
import { useRoute, type RouteLocationRaw } from "vue-router";
import { useBottomTabBarVisible } from "@/shared/lib/useBottomTabBarVisible";

/**
 * 会員サイトの Bottom Tab Bar (ホーム / 履歴 / プロフィール)。
 *
 * デザインサンプル: docs/10-デザインサンプル/reservation/hq-reserve-screens.jsx の
 *   `ScreenRHomeV2` / `ScreenRHistory` / `ScreenRProfile` 末尾に共通配置されている
 *   3 タブ navigation。
 *
 * - position: fixed で常に画面下部に固定 (スクロールしても見える)
 * - 表示条件は useBottomTabBarVisible() に集約 (App.vue の pb 切替と共通化)
 */

type TabKey = "home" | "history" | "profile";

const route = useRoute();
const isVisible = useBottomTabBarVisible();

const activeTab = computed<TabKey | null>(() => {
  const path = route.path;
  if (path.startsWith("/events")) return "home";
  if (path.startsWith("/history")) return "history";
  if (path.startsWith("/profile")) return "profile";
  return null;
});

type Tab = {
  key: TabKey;
  label: string;
  to: RouteLocationRaw;
};

const TABS: ReadonlyArray<Tab> = [
  { key: "home", label: "ホーム", to: { name: "events-list" } },
  { key: "history", label: "履歴", to: { name: "history" } },
  { key: "profile", label: "プロフィール", to: { name: "profile" } },
];
</script>

<template>
  <nav
    v-if="isVisible"
    aria-label="メインナビゲーション"
    class="fixed bottom-0 left-0 right-0 z-40 border-t border-hairline bg-paper flex"
    style="padding-bottom: env(safe-area-inset-bottom, 18px);"
    data-testid="bottom-tab-bar"
  >
    <router-link
      v-for="tab in TABS"
      :key="tab.key"
      :to="tab.to"
      class="flex-1 no-underline flex flex-col items-center gap-hq-1 py-hq-2 transition-colors"
      :class="
        activeTab === tab.key ? 'text-ink font-semibold' : 'text-muted'
      "
      :aria-current="activeTab === tab.key ? 'page' : undefined"
      :data-tab="tab.key"
    >
      <svg
        v-if="tab.key === 'home'"
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        :stroke-width="activeTab === 'home' ? 1.7 : 1.4"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-7H9v7H4a1 1 0 01-1-1v-9z" />
      </svg>
      <svg
        v-else-if="tab.key === 'history'"
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        :stroke-width="activeTab === 'history' ? 1.7 : 1.4"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
      <svg
        v-else
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        :stroke-width="activeTab === 'profile' ? 1.7 : 1.4"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="9" r="3.5" />
        <path d="M5 20c1.5-3.5 4-5 7-5s5.5 1.5 7 5" />
      </svg>
      <span
        class="font-jp text-xs"
        style="letter-spacing: 0.05em;"
      >{{ tab.label }}</span>
    </router-link>
  </nav>
</template>
