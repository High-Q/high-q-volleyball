<template>
  <Teleport to="body">
    <header class="header" :class="{ 'header--scrolled': scrolled }">
      <div class="header-inner">
        <a href="#top" class="logo">High Q</a>

        <nav class="nav-desktop">
          <a href="#concept">CONCEPT</a>
          <a href="#activities">ACTIVITIES</a>
          <a href="#event">EVENT</a>
        </nav>

        <button
          type="button"
          class="hamburger"
          aria-label="メニューを開く"
          :aria-expanded="menuOpen"
          @click="menuOpen = !menuOpen"
        >
          <span class="hamburger-bar" />
          <span class="hamburger-bar" />
          <span class="hamburger-bar" />
        </button>
      </div>

      <Transition name="mobile-menu">
        <nav v-if="menuOpen" class="mobile-menu">
          <a href="#concept" @click="menuOpen = false">CONCEPT</a>
          <a href="#activities" @click="menuOpen = false">ACTIVITIES</a>
          <a href="#event" @click="menuOpen = false">EVENT</a>
        </nav>
      </Transition>
    </header>
  </Teleport>
</template>

<script>
export default {
  name: "HeaderLine",
  data() {
    return {
      scrolled: false,
      menuOpen: false,
    };
  },
  mounted() {
    this.onScroll();
    window.addEventListener("scroll", this.onScroll, { passive: true });
  },
  beforeUnmount() {
    window.removeEventListener("scroll", this.onScroll);
  },
  methods: {
    onScroll() {
      this.scrolled = window.scrollY > 0;
    },
  },
};
</script>

<style scoped>
.header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  width: 100%;
  z-index: 1000;
  background: transparent;
  transition: background-color 200ms ease-out, box-shadow 200ms ease-out;
}

.header--scrolled {
  background: rgb(var(--v-theme-primary));
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
  padding: 0 16px;
  box-sizing: border-box;
}

.logo {
  color: #fff;
  font-weight: 700;
  font-size: 1.25rem;
  text-decoration: none;
  letter-spacing: 0.04em;
  white-space: nowrap;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
  transition: text-shadow 200ms ease-out;
}

.header--scrolled .logo {
  text-shadow: none;
}

.nav-desktop {
  display: none;
}

.hamburger {
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
  transition: background-color 150ms ease-out;
}

.hamburger:hover {
  background: rgba(255, 255, 255, 0.12);
}

.hamburger:focus-visible {
  outline: 2px solid #fff;
  outline-offset: 2px;
}

.hamburger-bar {
  display: block;
  width: 22px;
  height: 2px;
  background: #fff;
  border-radius: 1px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
}

.header--scrolled .hamburger-bar {
  box-shadow: none;
}

/* md+ ではテキストナビ表示・ハンバーガー非表示 */
@media (min-width: 960px) {
  .nav-desktop {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .nav-desktop a {
    color: #fff;
    text-decoration: none;
    font-size: 0.875rem;
    font-weight: 500;
    letter-spacing: 0.04em;
    padding: 8px 12px;
    border-radius: 4px;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
    transition: background-color 150ms ease-out, text-shadow 200ms ease-out;
  }
  .header--scrolled .nav-desktop a {
    text-shadow: none;
  }
  .nav-desktop a:hover {
    background-color: rgba(255, 255, 255, 0.12);
  }
  .hamburger {
    display: none;
  }
}

/* xs/sm のドロップダウン */
.mobile-menu {
  background: rgb(var(--v-theme-primary));
  display: flex;
  flex-direction: column;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.mobile-menu a {
  color: #fff;
  text-decoration: none;
  padding: 16px 20px;
  font-size: 0.95rem;
  font-weight: 500;
  letter-spacing: 0.04em;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.mobile-menu a:hover {
  background: rgba(255, 255, 255, 0.08);
}

.mobile-menu-enter-active,
.mobile-menu-leave-active {
  transition: max-height 200ms ease-out, opacity 200ms ease-out;
  overflow: hidden;
  max-height: 300px;
}

.mobile-menu-enter-from,
.mobile-menu-leave-to {
  max-height: 0;
  opacity: 0;
}
</style>
