<template>
  <v-app>
    <HeaderLine></HeaderLine>
    <v-main class="main-no-pad">
      <HomePage></HomePage>
    </v-main>
    <FooterLine></FooterLine>
  </v-app>
</template>

<script>
import HeaderLine from "@shared/ui/HeaderLine.vue";
import FooterLine from "@shared/ui/FooterLine.vue";
import { HomePage } from "@pages/home";

export default {
  components: {
    HeaderLine,
    HomePage,
    FooterLine,
  },
};
</script>

<style>
/* ブラウザ default の body margin: 8px をリセット
   Vuetify base styles を import していないため、body 余白が残り
   Hero / Content section が viewport 全幅にならない事象を解消 */
html,
body {
  margin: 0;
  padding: 0;
}

/* HeaderLine を独自 fixed header に切替たため、v-main の自動 padding-top を打ち消す。
   これにより Hero が画面最上部から始まり、透明 Header の背景に Hero 画像が見える */
.main-no-pad.v-main {
  --v-layout-top: 0px;
  padding-top: 0 !important;
}
</style>
