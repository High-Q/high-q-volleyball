<template>
  <div class="section-divider">
    <h2 class="section-divider__title">{{ title }}</h2>
    <div class="section-divider__bar" />
  </div>
</template>

<script>
export default {
  name: "SectionDivider",
  props: {
    title: { type: String, required: true },
  },
};
</script>

<style scoped>
.section-divider {
  margin-bottom: 32px;
}

.section-divider__title {
  font-size: 1.75rem;
  font-weight: 900;
  color: rgb(var(--v-theme-primary));
  letter-spacing: 0.08em;
  margin: 0 0 12px;
  line-height: 1.2;
}

.section-divider__bar {
  width: 44px;
  height: 4px;
  border-radius: 2px;
  background: linear-gradient(
    to right,
    rgb(var(--v-theme-primary)),
    rgb(var(--v-theme-secondary))
  );
}
</style>
