<script setup lang="ts">
import { onMounted, ref } from "vue";

/**
 * ページ固有の「モバイル主要アクション」を AppBar (`#admin-appbar-action`) へ流し込む
 * ラッパー。ターゲットが存在するとき (= シェル配下) のみ Teleport し、単体マウントや
 * テストでターゲットが無い場合は何も描画しない (Teleport 警告を避ける)。
 *
 * デスクトップの主要アクションは各ページの TopBar 側に通常描画する想定 (本コンポーネントは
 * モバイル AppBar 専用)。
 *
 * 関連:
 *   openspec/changes/admin-mobile-responsive/specs/admin-responsive-shell/spec.md
 *   openspec/changes/admin-mobile-responsive/design.md (D2)
 */
const ready = ref(false);

onMounted(() => {
  ready.value =
    typeof document !== "undefined" &&
    document.getElementById("admin-appbar-action") !== null;
});
</script>

<template>
  <Teleport v-if="ready" to="#admin-appbar-action">
    <slot />
  </Teleport>
</template>
