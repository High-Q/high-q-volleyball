<template>
  <v-app-bar color="primary" app>
    <v-toolbar-title class="header-title">High Q</v-toolbar-title>
    <div style="height: 40px">
      <v-divider vertical class="mx-7" dark></v-divider>
    </div>
    <p class="header-sub-title">江東区<br />バレーボールサークル</p>
    <v-spacer></v-spacer>
    <v-btn
      class="mr-4"
      width="30"
      height="30"
      min-width="30"
      min-height="30"
      color="#9EC9D6"
      href="https://twitter.com/c8w5y"
    >
      <v-icon color="primary">mdi-twitter</v-icon>
    </v-btn>
    <v-btn
      class="mr-4"
      width="30"
      height="30"
      min-width="30"
      min-height="30"
      color="#9EC9D6"
      href="https://www.instagram.com/hiyori0104/"
    >
      <v-icon color="primary">mdi-instagram</v-icon>
    </v-btn>
  </v-app-bar>
</template>

<script>
// import Icons from "./Icons.vue";
export default {
  // components: { Icons },
  name: "Header",
  // data: () => {
  //   return {
  //     icons: ["mdi-twitter"],
  //   };
  // },
};
</script>
<style lang="scss" scoped>
.header-title {
  color: white;
  text-align: center;
  font-size: 28px;
  font-weight: bold;
}
.header-sub-title {
  color: white;
  text-align: center;
  font-size: 13px;
  font-weight: bold;
  margin: 0px;
  text-align: left;
}
</style>
