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
/* スクロールバー出現/消失による幅変動を防ぐ（カードのはみ出し対策）
   modern browsers: scrollbar-gutter で viewport 内に scrollbar 領域を予約
   レガシー fallback: overflow-y: auto + body の overflow-x: hidden で横はみ出し抑止 */
html {
  scrollbar-gutter: stable;
  overflow-x: hidden;
}

body {
  overflow-x: hidden;
}

/* HeaderLine を独自 fixed header に切替たため、v-main の自動 padding-top を打ち消す。
   これにより Hero が画面最上部から始まり、透明 Header の背景に Hero 画像が見える */
.main-no-pad.v-main {
  --v-layout-top: 0px;
  padding-top: 0 !important;
}
</style>
