<template>
  <header
    class="site-header"
    :class="[
      transparent ? 'site-header--overlay' : 'site-header--sticky',
      transparent && scrolled ? 'site-header--scrolled' : null,
      menuOpen ? 'site-header--menu-open' : null,
    ]"
  >
    <div class="site-header__bar">
      <a href="/" class="site-header__brand" aria-label="High Q トップへ">
        <span class="site-header__brand-name">High Q</span>
        <span class="site-header__brand-region">江東区</span>
      </a>

      <button
        ref="hamburgerEl"
        type="button"
        class="site-header__hamburger"
        :aria-label="menuOpen ? 'メニューを閉じる' : 'メニューを開く'"
        :aria-expanded="menuOpen ? 'true' : 'false'"
        aria-controls="site-header-menu"
        @click="toggleMenu"
      >
        <span class="site-header__hamburger-bar" />
        <span class="site-header__hamburger-bar" />
      </button>
    </div>

    <Transition name="site-header-menu">
      <nav
        v-if="menuOpen"
        id="site-header-menu"
        ref="menuEl"
        class="site-header__menu"
        role="navigation"
        aria-label="サイト内ナビゲーション"
      >
        <a
          v-for="link in links"
          :key="link.href"
          :href="link.href"
          class="site-header__menu-link"
          @click="closeMenu"
        >
          {{ link.label }}
        </a>
      </nav>
    </Transition>
  </header>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'

defineProps({
  transparent: { type: Boolean, default: false },
})

const scrolled = ref(false)
const menuOpen = ref(false)
const hamburgerEl = ref(null)
const menuEl = ref(null)

const links = [
  { href: '#about-heading', label: 'About' },
  { href: '#features-heading', label: 'Features' },
  { href: '#flow-heading', label: '当日の流れ' },
  { href: '#event-list-heading', label: 'Events' },
  { href: '#faq-heading', label: 'FAQ' },
]

function onScroll() {
  if (typeof window === 'undefined') return
  scrolled.value = window.scrollY > 16
}

function toggleMenu() {
  menuOpen.value = !menuOpen.value
}

function closeMenu() {
  menuOpen.value = false
}

function onKeyDown(event) {
  if (event.key === 'Escape' && menuOpen.value) {
    closeMenu()
  }
}

function onOutsideClick(event) {
  if (!menuOpen.value) return
  const target = event.target
  if (
    hamburgerEl.value && hamburgerEl.value.contains(target)
  ) return
  if (
    menuEl.value && menuEl.value.contains(target)
  ) return
  closeMenu()
}

onMounted(async () => {
  if (typeof window === 'undefined') return
  onScroll()
  await nextTick()
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('click', onOutsideClick, true)
})

onBeforeUnmount(() => {
  if (typeof window === 'undefined') return
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('click', onOutsideClick, true)
})
</script>

<style scoped>
.site-header {
  z-index: 100;
  font-family: var(--hq-font-jp);
  box-sizing: border-box;
  transition: background-color 200ms ease-out, color 200ms ease-out, box-shadow 200ms ease-out;
}

.site-header__bar {
  padding: 10px 20px;
  padding-inline: max(20px, calc((100% - 880px) / 2));
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-sizing: border-box;
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

.site-header--overlay.site-header--scrolled,
.site-header--overlay.site-header--menu-open {
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
}

.site-header--overlay:not(.site-header--scrolled):not(.site-header--menu-open) .site-header__brand-name {
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

.site-header--overlay:not(.site-header--scrolled):not(.site-header--menu-open) .site-header__brand-region {
  opacity: 0.85;
}

.site-header__hamburger {
  width: 40px;
  height: 40px;
  padding: 0;
  background: transparent;
  border: none;
  cursor: pointer;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
  border-radius: 50%;
  color: inherit;
  transition: background 150ms ease;
}

.site-header__hamburger:hover {
  background: rgba(31, 29, 26, 0.06);
}

.site-header--overlay:not(.site-header--scrolled):not(.site-header--menu-open) .site-header__hamburger:hover {
  background: rgba(247, 243, 234, 0.08);
}

.site-header__hamburger:focus-visible {
  outline: 2px solid var(--hq-color-accent);
  outline-offset: 2px;
}

.site-header__hamburger-bar {
  display: block;
  width: 22px;
  height: 1px;
  background: currentColor;
}

.site-header--overlay:not(.site-header--scrolled):not(.site-header--menu-open) .site-header__hamburger-bar {
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
}

.site-header__menu {
  background: var(--hq-color-paper);
  border-top: 1px solid var(--hq-color-hairline);
  color: var(--hq-color-ink);
  padding-inline: max(20px, calc((100% - 880px) / 2));
}

.site-header__menu-link {
  display: block;
  padding: 16px 0;
  font-family: var(--hq-font-jp);
  font-size: 15px;
  font-weight: 500;
  letter-spacing: 0.04em;
  color: var(--hq-color-ink);
  text-decoration: none;
  border-bottom: 1px solid var(--hq-color-hairline-soft);
}

.site-header__menu-link:last-child {
  border-bottom: none;
}

.site-header__menu-link:hover {
  color: var(--hq-color-accent);
}

.site-header__menu-link:focus-visible {
  outline: 2px solid var(--hq-color-accent);
  outline-offset: -4px;
}

/* Transition */
.site-header-menu-enter-active,
.site-header-menu-leave-active {
  transition: max-height 200ms ease-out, opacity 200ms ease-out;
  overflow: hidden;
  max-height: 400px;
}

.site-header-menu-enter-from,
.site-header-menu-leave-to {
  max-height: 0;
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .site-header-menu-enter-active,
  .site-header-menu-leave-active {
    transition: none;
  }
}
</style>
