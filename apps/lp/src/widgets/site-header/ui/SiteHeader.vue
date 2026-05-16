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
        :class="{ 'site-header__hamburger--open': menuOpen }"
        :aria-label="menuOpen ? 'メニューを閉じる' : 'メニューを開く'"
        :aria-expanded="menuOpen ? 'true' : 'false'"
        :aria-controls="DRAWER_ID"
        @click="toggleMenu"
      >
        <span class="site-header__hamburger-icon" aria-hidden="true">
          <span class="site-header__hamburger-bar site-header__hamburger-bar--top" />
          <span class="site-header__hamburger-bar site-header__hamburger-bar--bottom" />
        </span>
      </button>
    </div>

    <Teleport to="body">
      <nav
        :id="DRAWER_ID"
        ref="drawerEl"
        class="site-drawer"
        :class="{ 'site-drawer--open': menuOpen }"
        :aria-hidden="menuOpen ? 'false' : 'true'"
        aria-label="サイトメニュー"
        tabindex="-1"
      >
        <div class="site-drawer__inner">
          <div class="site-drawer__kicker">Menu</div>
          <div class="site-drawer__nav">
            <a
              v-for="(link, idx) in links"
              :key="link.href"
              ref="drawerLinkEls"
              :href="link.href"
              class="site-drawer__link"
              @click="onLinkClick"
            >
              <span class="site-drawer__link-num">{{ formatNum(idx + 1) }}</span>
              <span class="site-drawer__link-label">{{ link.label }}</span>
              <span class="site-drawer__link-arrow" aria-hidden="true">›</span>
            </a>
          </div>
        </div>

        <div class="site-drawer__footer">
          <a
            class="site-drawer__cta-primary"
            :href="LINE_OPEN_CHAT_URL"
            target="_blank"
            rel="noopener noreferrer"
            data-testid="drawer-cta-line"
            @click="closeMenu"
          >
            LINE オープンチャットで連絡
          </a>
          <a
            class="site-drawer__cta-secondary"
            href="#event-list-heading"
            data-testid="drawer-cta-event-list"
            @click="onLinkClick"
          >
            イベント一覧を見る
          </a>
          <div class="site-drawer__meta">
            <span>Tokyo · Koto-ku</span>
            <span>© 2026 High Q</span>
          </div>
        </div>
      </nav>
    </Teleport>
  </header>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { LINE_OPEN_CHAT_URL } from '@shared/config/sns'

defineProps({
  transparent: { type: Boolean, default: false },
})

const DRAWER_ID = 'site-drawer'

const scrolled = ref(false)
const menuOpen = ref(false)
const hamburgerEl = ref(null)
const drawerEl = ref(null)
const drawerLinkEls = ref([])

const links = [
  { href: '#about-heading', label: 'はじめての方へ' },
  { href: '#features-heading', label: 'High Q について' },
  { href: '#flow-heading', label: '当日の流れ' },
  { href: '#event-list-heading', label: '開催スケジュール' },
  { href: '#faq-heading', label: 'よくある質問' },
]

function formatNum(n) {
  return String(n).padStart(2, '0')
}

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

function onLinkClick() {
  setTimeout(closeMenu, 80)
}

function onKeyDown(event) {
  if (event.key === 'Escape' && menuOpen.value) {
    closeMenu()
    hamburgerEl.value?.focus()
  }
}

watch(menuOpen, async (open) => {
  if (typeof document === 'undefined') return
  document.body.classList.toggle('is-locked', open)
  if (open) {
    await nextTick()
    const first = drawerLinkEls.value?.[0]
    if (first && typeof first.focus === 'function') {
      setTimeout(() => first.focus(), 220)
    }
  } else {
    hamburgerEl.value?.focus()
  }
})

onMounted(async () => {
  if (typeof window === 'undefined') return
  onScroll()
  await nextTick()
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('keydown', onKeyDown)
})

onBeforeUnmount(() => {
  if (typeof window === 'undefined') return
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('keydown', onKeyDown)
  if (typeof document !== 'undefined') {
    document.body.classList.remove('is-locked')
  }
})
</script>

<style scoped>
.site-header {
  z-index: 100;
  font-family: var(--hq-font-jp);
  box-sizing: border-box;
  transition:
    background-color 200ms var(--hq-motion-ease),
    color 200ms var(--hq-motion-ease),
    box-shadow 200ms var(--hq-motion-ease),
    border-color 200ms var(--hq-motion-ease);
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

/* Hamburger trigger (2 bars → ✕) */
.site-header__hamburger {
  width: 44px;
  height: 44px;
  padding: 0;
  background: transparent;
  border: none;
  cursor: pointer;
  display: grid;
  place-items: center;
  color: inherit;
  border-radius: 50%;
  transition: background 150ms var(--hq-motion-ease);
}

.site-header__hamburger:hover {
  background: var(--hq-color-hairline-soft);
}

.site-header--overlay:not(.site-header--scrolled):not(.site-header--menu-open) .site-header__hamburger:hover {
  background: rgba(247, 243, 234, 0.08);
}

.site-header__hamburger:focus-visible {
  outline: 2px solid var(--hq-color-accent);
  outline-offset: 2px;
}

.site-header__hamburger-icon {
  position: relative;
  width: 22px;
  height: 14px;
  display: block;
}

.site-header__hamburger-bar {
  position: absolute;
  left: 0;
  right: 0;
  height: 1.5px;
  background: currentColor;
  transition:
    transform 220ms var(--hq-motion-ease),
    top 180ms var(--hq-motion-ease) 80ms,
    opacity 120ms var(--hq-motion-ease);
}

.site-header__hamburger-bar--top {
  top: 2px;
}

.site-header__hamburger-bar--bottom {
  top: 10px;
}

.site-header--overlay:not(.site-header--scrolled):not(.site-header--menu-open) .site-header__hamburger-bar {
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
}

.site-header__hamburger--open .site-header__hamburger-bar--top {
  top: 6px;
  transform: rotate(45deg);
  transition:
    top 180ms var(--hq-motion-ease),
    transform 220ms var(--hq-motion-ease) 100ms;
}

.site-header__hamburger--open .site-header__hamburger-bar--bottom {
  top: 6px;
  transform: rotate(-45deg);
  transition:
    top 180ms var(--hq-motion-ease),
    transform 220ms var(--hq-motion-ease) 100ms;
}

/* Drawer (Teleport to body) */
.site-drawer {
  position: fixed;
  inset: 0;
  z-index: 90;
  background: var(--hq-color-paper);
  color: var(--hq-color-ink);
  display: flex;
  flex-direction: column;
  opacity: 0;
  transform: translateY(8px);
  pointer-events: none;
  transition:
    opacity 200ms var(--hq-motion-ease),
    transform 280ms var(--hq-motion-ease);
  font-family: var(--hq-font-jp);
}

.site-drawer--open {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}

.site-drawer__inner {
  flex: 1 1 auto;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 80px 28px 16px;
  padding-inline: max(28px, calc((100% - 560px) / 2));
}

.site-drawer__kicker {
  font-family: var(--hq-font-mono);
  font-size: 10px;
  letter-spacing: 0.2em;
  color: var(--hq-color-muted);
  margin-bottom: 24px;
  text-transform: uppercase;
}

.site-drawer__nav {
  display: grid;
}

.site-drawer__link {
  display: grid;
  grid-template-columns: 36px 1fr auto;
  align-items: baseline;
  gap: 14px;
  padding: 22px 0;
  border-top: 1px solid var(--hq-color-hairline);
  text-decoration: none;
  color: inherit;
  transition: padding-left 200ms var(--hq-motion-ease);
}

.site-drawer__link:last-child {
  border-bottom: 1px solid var(--hq-color-hairline);
}

.site-drawer__link:hover {
  padding-left: 4px;
}

.site-drawer__link:focus-visible {
  outline: 2px solid var(--hq-color-accent);
  outline-offset: 4px;
}

.site-drawer__link-num {
  font-family: var(--hq-font-mono);
  font-size: 10px;
  letter-spacing: 0.18em;
  color: var(--hq-color-muted);
}

.site-drawer__link-label {
  font-family: var(--hq-font-jp-display);
  font-size: 24px;
  font-weight: 400;
  line-height: 1.35;
}

.site-drawer__link-arrow {
  font-family: var(--hq-font-mono);
  font-size: 14px;
  color: var(--hq-color-muted);
  transition:
    transform 200ms var(--hq-motion-ease),
    color 200ms var(--hq-motion-ease);
}

.site-drawer__link:hover .site-drawer__link-arrow {
  transform: translateX(4px);
  color: var(--hq-color-ink);
}

/* Drawer footer */
.site-drawer__footer {
  flex: 0 0 auto;
  padding: 16px 20px calc(20px + env(safe-area-inset-bottom));
  background: var(--hq-color-paper);
  border-top: 1px solid var(--hq-color-hairline);
  display: grid;
  gap: 10px;
}

.site-drawer__cta-primary,
.site-drawer__cta-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 48px;
  border-radius: var(--hq-radius-pill);
  font-family: var(--hq-font-jp);
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  letter-spacing: 0.02em;
  transition:
    opacity 150ms var(--hq-motion-ease),
    background 150ms var(--hq-motion-ease);
}

.site-drawer__cta-primary {
  background: var(--hq-color-ink);
  color: var(--hq-color-paper);
  border: 1px solid var(--hq-color-ink);
}

.site-drawer__cta-primary:hover {
  opacity: 0.92;
}

.site-drawer__cta-primary:focus-visible {
  outline: 2px solid var(--hq-color-accent);
  outline-offset: 2px;
}

.site-drawer__cta-secondary {
  background: transparent;
  color: var(--hq-color-ink);
  border: 1px solid var(--hq-color-hairline);
}

.site-drawer__cta-secondary:hover {
  background: var(--hq-color-paper-warm);
}

.site-drawer__cta-secondary:focus-visible {
  outline: 2px solid var(--hq-color-accent);
  outline-offset: 2px;
}

.site-drawer__meta {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid var(--hq-color-hairline-soft);
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-family: var(--hq-font-mono);
  font-size: 10px;
  letter-spacing: 0.14em;
  color: var(--hq-color-muted);
  text-transform: uppercase;
}

@media (prefers-reduced-motion: reduce) {
  .site-drawer,
  .site-drawer__link,
  .site-drawer__link-arrow,
  .site-drawer__cta-primary,
  .site-drawer__cta-secondary,
  .site-header__hamburger-bar,
  .site-header__hamburger--open .site-header__hamburger-bar--top,
  .site-header__hamburger--open .site-header__hamburger-bar--bottom {
    transition: none;
  }
}
</style>
