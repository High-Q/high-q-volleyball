<template>
  <v-toolbar color="primary">
    <template v-slot:prepend>
      <div class="text-h5 header-title">High Q</div>
    </template>

    <v-divider class="ms-3" inset vertical></v-divider>

    <v-toolbar-title class="header-sub-title"
      >江東区<br />バレーボールサークル</v-toolbar-title
    >

    <v-spacer></v-spacer>
      <v-btn icon="fa-brands fa-square-x-twitter" />
  </v-toolbar>
</template>

<script>
export default {
  name: "HeaderLine",
};
</script>
<style lang="scss" scoped>
.header-title {
  color: white;
  text-align: center;
  font-weight: 700;
}
.header-sub-title {
  color: white;
  text-align: center;
  font-size: 8px;
  font-weight: 700;
  text-align: left;
  line-height: 12px;
}
</style>
