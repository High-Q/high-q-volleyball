<script setup lang="ts">
import { Kicker } from "@high-q/ui";

/**
 * Dashboard の各ブロックを包む共通カード枠 (#149)。
 *
 * header (kicker + title + 右肩スロット) と body スロットを持つ。
 * StatCards / UpcomingEvents / Notifications / RecentBookings が共通利用する。
 *
 * 関連: openspec/changes/admin-dashboard-screen/specs/admin-dashboard/spec.md
 */

withDefaults(
  defineProps<{
    /** Kicker テキスト (例: "Next up")。省略時は header の kicker 行を出さない。 */
    kicker?: string;
    /** カードのタイトル (例: "直近のイベント")。 */
    title?: string;
  }>(),
  { kicker: "", title: "" },
);
</script>

<template>
  <section
    class="flex flex-col gap-hq-4 rounded-hq-md border border-hairline bg-paper p-hq-6"
  >
    <header
      v-if="title !== '' || $slots.action"
      class="flex items-baseline justify-between gap-hq-3"
    >
      <div class="flex flex-col gap-hq-1">
        <Kicker v-if="kicker !== ''" color="accent">— {{ kicker }}</Kicker>
        <h2 v-if="title !== ''" class="font-jp-display text-base text-ink">
          {{ title }}
        </h2>
      </div>
      <slot name="action" />
    </header>
    <slot />
  </section>
</template>
