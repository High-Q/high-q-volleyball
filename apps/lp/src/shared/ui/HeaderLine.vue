<template>
  <header class="header" :class="{ 'header--scrolled': scrolled }">
    <div class="header-inner">
      <a href="#top" class="header-brand">High Q</a>

      <nav class="header-nav d-none d-md-flex">
        <a href="#concept">CONCEPT</a>
        <a href="#activities">ACTIVITIES</a>
        <a href="#event">EVENT</a>
      </nav>

      <v-menu>
        <template #activator="{ props }">
          <v-btn
            v-bind="props"
            icon="mdi-menu"
            variant="text"
            color="white"
            class="d-md-none header-menu-btn"
            aria-label="ナビゲーションを開く"
          />
        </template>
        <v-list>
          <v-list-item href="#concept" title="CONCEPT" />
          <v-list-item href="#activities" title="ACTIVITIES" />
          <v-list-item href="#event" title="EVENT" />
        </v-list>
      </v-menu>
    </div>
  </header>
</template>

<script>
export default {
  name: "HeaderLine",
  data() {
    return {
      scrolled: false,
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
  z-index: 1000;
  height: 64px;
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
  height: 100%;
  padding-inline: 16px 8px;
  gap: 16px;
  /* 子要素のはみ出しを防止（特に xs で nav-btn と brand の衝突対策） */
  overflow: hidden;
}

.header-brand {
  color: #fff;
  font-weight: 700;
  font-size: 1.25rem;
  text-decoration: none;
  letter-spacing: 0.04em;
  /* xs/sm で wrap して 2 行になるのを防ぐ */
  white-space: nowrap;
  flex-shrink: 0;
  /* 透明時の Hero 画像の明るい部分と同化しないよう輪郭を保証 */
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
  transition: text-shadow 200ms ease-out;
}

.header--scrolled .header-brand {
  text-shadow: none;
}

.header-nav {
  margin-left: auto;
  align-items: center;
  gap: 4px;
}

.header-nav a {
  color: #fff;
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 500;
  letter-spacing: 0.04em;
  padding: 8px 12px;
  border-radius: 4px;
  transition: background-color 150ms ease-out, text-shadow 200ms ease-out;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
}

.header--scrolled .header-nav a {
  text-shadow: none;
}

.header-nav a:hover {
  background-color: rgba(255, 255, 255, 0.12);
}

/* xs/sm: ハンバーガーボタンを右端に。flex-shrink: 0 で縮小防止 */
.header-menu-btn {
  margin-left: auto;
  flex-shrink: 0;
}
</style>
