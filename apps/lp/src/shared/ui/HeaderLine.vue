<template>
  <v-app-bar
    :color="scrolled ? 'primary' : 'transparent'"
    :elevation="scrolled ? 4 : 0"
    flat
    scroll-behavior="elevate"
    class="header-line"
  >
    <v-app-bar-title>
      <a href="#top" class="header-brand">High Q</a>
    </v-app-bar-title>

    <!-- md 以上はテキストナビ横並び（v-app-bar の default 配置） -->
    <div class="d-none d-md-flex align-center ga-2 mr-2">
      <v-btn variant="text" color="white" href="#concept">CONCEPT</v-btn>
      <v-btn variant="text" color="white" href="#activities">ACTIVITIES</v-btn>
      <v-btn variant="text" color="white" href="#event">EVENT</v-btn>
    </div>

    <template #append>
      <!-- xs/sm はドロップダウンメニュー -->
      <v-menu>
        <template #activator="{ props }">
          <v-app-bar-nav-icon
            v-bind="props"
            color="white"
            class="d-md-none"
            aria-label="ナビゲーションを開く"
          />
        </template>
        <v-list>
          <v-list-item href="#concept" title="CONCEPT" />
          <v-list-item href="#activities" title="ACTIVITIES" />
          <v-list-item href="#event" title="EVENT" />
        </v-list>
      </v-menu>
    </template>
  </v-app-bar>
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
.header-brand {
  color: #fff;
  font-weight: 700;
  font-size: 1.25rem;
  text-decoration: none;
  letter-spacing: 0.04em;
}
</style>
