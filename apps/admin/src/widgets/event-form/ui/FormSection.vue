<script setup lang="ts">
import { Kicker } from "@high-q/ui";

/**
 * EventForm 内のセクション枠。kicker（番号）+ title + 任意の hint + 子要素 slot。
 * デザインサンプル `docs/10-デザインサンプル/admin/hq-admin-screens.jsx` の
 * `FormSection` に準拠。
 *
 * 関連:
 *   openspec/changes/admin-events-crud-screen/specs/admin-events-crud/spec.md
 *   openspec/changes/admin-events-crud-screen/design.md (§3.1, §6)
 */

defineProps<{
  kicker: string;
  title: string;
  hint?: string;
}>();
</script>

<template>
  <section
    class="border-t border-hairline first:border-t-0 py-hq-6 grid grid-cols-1 md:grid-cols-[200px_1fr] gap-hq-4 md:gap-hq-8"
  >
    <header class="flex flex-col gap-hq-1">
      <Kicker color="accent">— {{ kicker }}</Kicker>
      <h3 class="font-jp text-base font-medium text-ink">{{ title }}</h3>
      <p
        v-if="hint"
        class="font-jp text-xs text-muted leading-relaxed mt-hq-1"
      >
        {{ hint }}
      </p>
    </header>
    <div class="flex flex-col gap-hq-4">
      <slot />
    </div>
  </section>
</template>
