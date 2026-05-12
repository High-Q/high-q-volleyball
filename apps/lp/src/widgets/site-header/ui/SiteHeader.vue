<template>
  <header
    class="site-header"
    :class="[
      transparent ? 'site-header--overlay' : 'site-header--sticky',
      transparent && scrolled ? 'site-header--scrolled' : null,
    ]"
  >
    <a href="/" class="site-header__brand" aria-label="High Q トップへ">
      <span class="site-header__brand-name">High Q</span>
      <span class="site-header__brand-region">江東区</span>
    </a>
  </header>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'

defineProps({
  transparent: { type: Boolean, default: false },
})

const scrolled = ref(false)

function onScroll() {
  if (typeof window === 'undefined') return
  scrolled.value = window.scrollY > 16
}

onMounted(async () => {
  if (typeof window === 'undefined') return
  // 初回マウント直後の同期判定（ブラウザがスクロール位置を覚えているリロード時に効く）
  onScroll()
  // 次フレームで再評価（DOM レイアウト確定後、確実に正しい scrollY を取得）
  await nextTick()
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
})

onBeforeUnmount(() => {
  if (typeof window === 'undefined') return
  window.removeEventListener('scroll', onScroll)
})
</script>

<style scoped>
.site-header {
  z-index: 100;
  padding: 10px 20px;
  padding-inline: max(20px, calc((100% - 880px) / 2));
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-family: var(--hq-font-jp);
  box-sizing: border-box;
  transition: background-color 200ms ease-out, color 200ms ease-out, box-shadow 200ms ease-out;
}

.site-header--sticky {
  position: sticky;
  top: 0;
  background: var(--hq-color-paper);
  border-bottom: 1px solid var(--hq-color-hairline);
  color: var(--hq-color-ink);
}

.site-header--overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background: transparent;
  color: var(--hq-color-paper);
}

.site-header--overlay.site-header--scrolled {
  background: var(--hq-color-paper);
  color: var(--hq-color-ink);
  border-bottom: 1px solid var(--hq-color-hairline);
  box-shadow: var(--hq-shadow-sm);
}

.site-header__brand {
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
  text-decoration: none;
  color: inherit;
}

.site-header__brand-name {
  font-family: var(--hq-font-jp-display);
  font-size: 18px;
  font-weight: 500;
  letter-spacing: 0.04em;
  text-shadow: inherit;
}

.site-header--overlay:not(.site-header--scrolled) .site-header__brand-name {
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
}

.site-header__brand-region {
  font-family: var(--hq-font-mono);
  font-size: 9px;
  letter-spacing: 0.2em;
  color: currentColor;
  opacity: 0.6;
  text-transform: uppercase;
}

.site-header--overlay:not(.site-header--scrolled) .site-header__brand-region {
  opacity: 0.85;
}
</style>
