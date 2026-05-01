<script setup lang="ts">
import { computed } from "vue";

/**
 * チェックイン状態を切り替える Switch (Toggle) UI。
 *
 * - WAI-ARIA: role="switch" + aria-checked + aria-label + tabindex
 * - キーボード: Space / Enter で toggle
 * - in-flight: aria-busy=true + aria-disabled=true + 半透明 + クリック無効
 * - アニメーション: 150ms slide。`prefers-reduced-motion: reduce` で 0ms
 *
 * 関連:
 *   openspec/changes/admin-event-detail-screen/specs/admin-event-detail/spec.md
 *   openspec/changes/admin-event-detail-screen/design.md (D10)
 */

interface Props {
  checked: boolean;
  /** 行の member 名（aria-label 用） */
  memberName: string;
  /** mutation 進行中フラグ */
  inFlight?: boolean;
}

const props = withDefaults(defineProps<Props>(), { inFlight: false });

const emit = defineEmits<{
  (e: "toggle"): void;
}>();

const ariaLabel = computed(() => `${props.memberName} のチェックイン`);

function handleClick(): void {
  if (props.inFlight) return;
  emit("toggle");
}

function handleKeydown(event: KeyboardEvent): void {
  if (props.inFlight) return;
  if (event.key === " " || event.key === "Enter") {
    event.preventDefault();
    emit("toggle");
  }
}
</script>

<template>
  <button
    type="button"
    role="switch"
    :aria-checked="checked"
    :aria-label="ariaLabel"
    :aria-busy="inFlight"
    :aria-disabled="inFlight"
    :tabindex="0"
    class="hq-checkin-toggle"
    :class="{
      'hq-checkin-toggle--on': checked,
      'hq-checkin-toggle--busy': inFlight,
    }"
    @click="handleClick"
    @keydown="handleKeydown"
  >
    <span class="hq-checkin-toggle__track">
      <span class="hq-checkin-toggle__thumb" />
    </span>
    <span class="hq-checkin-toggle__label" data-testid="checkin-label">
      {{ checked ? "済" : "未" }}
    </span>
  </button>
</template>

<style scoped>
.hq-checkin-toggle {
  display: inline-flex;
  align-items: center;
  gap: var(--hq-space-2);
  padding: var(--hq-space-1) var(--hq-space-2);
  background: transparent;
  border: 0;
  cursor: pointer;
  font-family: var(--hq-font-jp);
  font-size: 12px;
  color: var(--hq-color-ink);
  border-radius: var(--hq-radius-sm);
}

.hq-checkin-toggle:focus-visible {
  outline: 2px solid var(--hq-color-accent);
  outline-offset: 2px;
}

.hq-checkin-toggle__track {
  position: relative;
  display: inline-block;
  width: 32px;
  height: 18px;
  border-radius: 9999px;
  background: var(--hq-color-hairline);
  transition: background-color 150ms ease;
}

.hq-checkin-toggle__thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--hq-color-paper);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
  transition: transform 150ms ease;
}

.hq-checkin-toggle--on .hq-checkin-toggle__track {
  background: var(--hq-color-success);
}

.hq-checkin-toggle--on .hq-checkin-toggle__thumb {
  transform: translateX(14px);
}

.hq-checkin-toggle--on .hq-checkin-toggle__label {
  color: var(--hq-color-success);
  font-weight: 500;
}

.hq-checkin-toggle--busy {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (prefers-reduced-motion: reduce) {
  .hq-checkin-toggle__track,
  .hq-checkin-toggle__thumb {
    transition: none;
  }
}
</style>
