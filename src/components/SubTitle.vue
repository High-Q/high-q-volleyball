<template>
  <v-container class="mt-16">
    <h1 class="text-h3 primary--text font-weight-bold">{{ title }}</h1>
    <hr class="first_border" />
    <hr class="second_border"/>
  </v-container>
</template>
<script>
export default {
  name: "SubTitle",
  props: ["title"],
};
</script>
<style lang="scss">
hr.first_border {
  border-width: 2px 0px 0px 0px; /* 太さ */
  border-style: solid; /* 線種 */
  border-color: #182F43; /* 線色 */
  height: 2px; /* 高さ(※古いIE用) */
  margin:16px 0px 5px;
}
hr.second_border {
  border-width: 2px 0px 0px 0px; /* 太さ */
  border-style: solid; /* 線種 */
  background-color: #85BBCC; /* 線色 */
  height: 2px; /* 高さ(※古いIE用) */
}
</style>
