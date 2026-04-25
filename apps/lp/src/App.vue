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
   scrollbar-gutter / overflow-x の global hack はすべて撤去（Hero / Content section が
   viewport 全幅で表示されるよう、html/body には何も触らない） */
.main-no-pad.v-main {
  --v-layout-top: 0px;
  padding-top: 0 !important;
}
</style>
