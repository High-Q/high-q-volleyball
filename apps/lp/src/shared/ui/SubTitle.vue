<template>
  <div class="section-title mb-10">
    <h2 class="text-h4 text-sm-h3 font-weight-bold text-primary mb-3">{{ title }}</h2>
    <div class="title-bar"></div>
  </div>
</template>

<script>
export default {
  name: "SubTitle",
  props: ["title"],
};
</script>

<style scoped>
.title-bar {
  width: 52px;
  height: 4px;
  border-radius: 2px;
  background: linear-gradient(to right, rgb(var(--v-theme-primary)), rgb(var(--v-theme-secondary)));
}
</style>
