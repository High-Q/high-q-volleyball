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
    /** 右下に表示するラベル。未指定時かつ src 未指定時のみ描画 */
    label?: string;
    /** 実画像 URL。指定時は placeholder ではなく `<img>` を描画する */
    src?: string;
    /** 実画像の alt テキスト。未指定時は `alt=""`（装飾画像扱い）でフォールバック */
    alt?: string;
    /**
     * 画像トーンの統一プリセット。指定時のみ filter + 紙色オーバーレイ (`::after`)
     * を当て、`data-tone` 属性経由で個別補正する。未指定なら何も加工しない（戻せる）。
     */
    tone?: "hero" | "about" | "cta";
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
  <div
    class="hq-photo"
    :class="{
      'hq-photo--has-image': !!src,
      'hq-photo--toned': !!src && !!tone,
    }"
    :style="containerStyle"
  >
    <img
      v-if="src"
      :src="src"
      :alt="alt ?? ''"
      :data-tone="tone"
      class="hq-photo__img"
    />
    <span v-else-if="label" class="hq-photo__label">[ {{ label }} ]</span>
  </div>
</template>

<style scoped>
.hq-photo {
  position: relative;
  flex-shrink: 0;
  overflow: hidden;
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

.hq-photo--has-image {
  background: none;
}

.hq-photo__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
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

/* === tone プリセット: tone prop 指定時のみ有効 ===
 * 共通ベース + tone 別微補正 + 和紙トーンオーバーレイ。
 * tone="..." を外せば全て無効化されて素の画像に戻る（戻せる設計）。
 */
.hq-photo--toned .hq-photo__img[data-tone] {
  filter: saturate(0.9) contrast(0.96) brightness(1.02);
}

.hq-photo--toned .hq-photo__img[data-tone="hero"] {
  filter: saturate(0.88) contrast(0.92) brightness(1.06);
}

.hq-photo--toned .hq-photo__img[data-tone="about"] {
  filter: saturate(0.78) contrast(0.95) brightness(1) hue-rotate(-4deg);
}

.hq-photo--toned .hq-photo__img[data-tone="cta"] {
  filter: saturate(0.92) contrast(0.96) brightness(1);
}

/* 和紙トーン: HQ.paperWarm を soft-light で 3 枚に共通の紙色フィルムをかける */
.hq-photo--toned::after {
  content: "";
  position: absolute;
  inset: 0;
  background: var(--hq-color-paper-warm);
  mix-blend-mode: soft-light;
  opacity: 0.35;
  pointer-events: none;
}
</style>
