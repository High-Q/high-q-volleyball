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
/* HeaderLine を独自 fixed header に切替たため、v-main の自動 padding-top を打ち消す。
   これにより Hero が画面最上部から始まり、透明 Header の背景に Hero 画像が見える。
   body の margin / padding reset は vuetify/styles (vuetify.js で import) が
   担当するため、ここでは触らない */
.main-no-pad.v-main {
  --v-layout-top: 0px;
  padding-top: 0 !important;
}
</style>
