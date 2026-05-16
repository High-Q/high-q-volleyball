<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    /** 高さ。number は px に展開、string はそのまま使う */
    h?: number | string;
    /** 幅。number は px に展開、string はそのまま使う（'100%' / '320px' 等） */
    w?: number | string;
    /** border-radius。number は px に展開、string はそのまま使う */
    radius?: number | string;
    /** 右下に表示するラベル。未指定時は描画しない */
    label?: string;
  }>(),
  {
    h: 200,
    w: "100%",
    radius: 0,
  },
);

function toCss(value: number | string): string {
  return typeof value === "number" ? `${value}px` : value;
}

const containerStyle = computed(() => ({
  height: toCss(props.h),
  width: toCss(props.w),
  borderRadius: toCss(props.radius),
}));
</script>

<template>
  <div class="hq-photo" :style="containerStyle">
    <span v-if="label" class="hq-photo__label">[ {{ label }} ]</span>
  </div>
</template>

<style scoped>
.hq-photo {
  position: relative;
  flex-shrink: 0;
  background:
    repeating-linear-gradient(
      135deg,
      var(--hq-color-hairline) 0,
      var(--hq-color-hairline) 1px,
      transparent 1px,
      transparent 9px
    ),
    linear-gradient(180deg, var(--hq-color-paper-warm) 0%, var(--hq-color-muted) 100%);
}

.hq-photo__label {
  position: absolute;
  bottom: 8px;
  right: 10px;
  color: var(--hq-color-muted);
  font-family: var(--hq-font-mono);
  font-size: 9px;
  letter-spacing: 0.12em;
  opacity: 0.85;
}
</style>
