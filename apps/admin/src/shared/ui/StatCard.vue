<script setup lang="ts">
import { computed } from "vue";
import { Kicker } from "@high-q/ui";

/**
 * Dashboard 用 StatCard プリミティブ (#149)。
 *
 * design sample: docs/10-デザインサンプル/admin/hq-admin-screens.jsx (ScreenDashboard)
 * 関連: openspec/changes/admin-dashboard-screen/specs/admin-dashboard/spec.md
 */

export type DeltaTone = "up" | "down" | "flat";

const props = withDefaults(
  defineProps<{
    /** kicker 番号 (例: "01")。デザイン上の連番表現。 */
    kicker: string;
    /** カードの主ラベル (例: "今後のイベント")。 */
    label: string;
    /** 主指標 (例: 6 / "¥84,500" / "—")。 */
    value: string | number;
    /** value の単位 (例: "件" / "名" / "%")。 */
    unit?: string;
    /**
     * 先月対比などの delta 表記。NULL の場合は "— %"。
     * 表示は呼び出し側で「+12%」「-3%」のように整形した文字列を渡す。
     */
    delta?: string;
    /** delta の上下トーン。null/未指定なら中立 (flat) 扱い。 */
    deltaTone?: DeltaTone;
    /** 追加サブテキスト (例: "2 件は満員")。 */
    sub?: string;
    /** accent 色強調 (主指標を目立たせたい場合)。 */
    accent?: boolean;
  }>(),
  {
    unit: "",
    delta: "",
    deltaTone: "flat",
    sub: "",
    accent: false,
  },
);

const deltaClass = computed(() => {
  switch (props.deltaTone) {
    case "up":
      return "stat-card__delta--up";
    case "down":
      return "stat-card__delta--down";
    default:
      return "stat-card__delta--flat";
  }
});
</script>

<template>
  <div
    class="stat-card flex flex-col gap-hq-2 rounded-hq-md border border-hairline bg-paper p-hq-5"
    :class="{ 'stat-card--accent': accent }"
  >
    <div class="flex items-baseline justify-between gap-hq-3">
      <Kicker color="accent">— {{ kicker }}</Kicker>
      <span
        v-if="delta !== ''"
        class="stat-card__delta font-mono text-xs"
        :class="deltaClass"
        aria-label="先月対比"
      >
        {{ delta }}
      </span>
    </div>
    <div class="font-jp text-xs text-muted">{{ label }}</div>
    <div class="flex items-baseline gap-hq-1">
      <span class="stat-card__value font-jp-display text-2xl text-ink">{{
        value
      }}</span>
      <span v-if="unit !== ''" class="font-jp text-xs text-muted">{{ unit }}</span>
    </div>
    <div v-if="sub !== ''" class="font-jp text-xs text-muted">{{ sub }}</div>
  </div>
</template>

<style scoped>
.stat-card--accent {
  border-color: var(--hq-color-accent);
}

.stat-card__delta--up {
  color: var(--hq-color-success);
}

.stat-card__delta--down {
  color: var(--hq-color-danger);
}

.stat-card__delta--flat {
  color: var(--hq-color-muted);
}
</style>
