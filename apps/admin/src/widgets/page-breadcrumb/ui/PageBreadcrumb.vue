<script setup lang="ts">
import { computed } from "vue";
import { Kicker } from "@high-q/ui";
import type { RouteLocationRaw } from "vue-router";

/**
 * 全ページ共通のパンくずナビ。各セグメントは router-link、末尾 (active) のみ
 * リンクなしのテキスト。Kicker の見た目を踏襲し、HQ デザイン言語に統合。
 *
 * 使い方:
 *   <PageBreadcrumb :items="[
 *     { label: 'Workspace' },                          // ラベルのみ (静的セクション)
 *     { label: 'Events', to: { name: 'events' } },     // リンク
 *     { label: 'ゆる練 vol.42' },                       // 末尾 = active
 *   ]" />
 *
 * a11y:
 *   - <nav aria-label="パンくず">
 *   - 末尾要素に aria-current="page"
 *
 * 関連:
 *   openspec/changes/admin-event-detail-screen/specs/admin-event-detail/spec.md
 */

interface BreadcrumbItem {
  label: string;
  /** undefined なら静的テキスト (リンクなし) */
  to?: RouteLocationRaw;
}

const props = defineProps<{
  items: ReadonlyArray<BreadcrumbItem>;
}>();

const lastIndex = computed(() => props.items.length - 1);
</script>

<template>
  <nav aria-label="パンくず" class="hq-breadcrumb">
    <Kicker color="muted">
      <span class="inline-flex items-center gap-hq-1">
        <span aria-hidden="true">—</span>
        <template v-for="(item, idx) in items" :key="idx">
          <span v-if="idx > 0" aria-hidden="true" class="text-muted opacity-60">/</span>
          <router-link
            v-if="item.to !== undefined && idx !== lastIndex"
            :to="item.to"
            class="hq-breadcrumb__link"
          >{{ item.label }}</router-link>
          <span
            v-else
            :aria-current="idx === lastIndex ? 'page' : undefined"
            :class="idx === lastIndex ? 'text-ink-soft' : ''"
          >{{ item.label }}</span>
        </template>
      </span>
    </Kicker>
  </nav>
</template>

<style scoped>
.hq-breadcrumb__link {
  color: inherit;
  text-decoration: none;
  transition: color 120ms ease;
}

.hq-breadcrumb__link:hover {
  color: var(--hq-color-ink);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.hq-breadcrumb__link:focus-visible {
  outline: 2px solid var(--hq-color-accent);
  outline-offset: 2px;
  border-radius: 2px;
}
</style>
