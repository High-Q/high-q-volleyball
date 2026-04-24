<template>
  <v-container fill-height>
    <v-row justify="start">
      <SubTitle title="High-Q's concept"></SubTitle>
    </v-row>
    <v-row justify="center">
      <v-col align="center" class="mt-13" cols="12" md="4">
        <concept-card
          icon="far fa-handshake"
          title="notガチ勢 butエンジョイ勢"
          text="ラリーが続かなくてもOK！
          レシーブやスパイクができるまで
          のびのびやりましょう。
          主幹事も頑張ってレクチャーします。"
        ></concept-card>
      </v-col>
      <v-col align="center" class="mt-13" cols="12" md="4">
        <concept-card
          class="secondary-card"
          icon="fas fa-circle-notch"
          title="・・・！！！！上ッ！"
          text="・・・突然の視力検査ッ
          

          
          "
        ></concept-card>
      </v-col>
      <v-col align="center" class="mt-13" cols="12" md="4">
        <concept-card
          icon="mdi-glass-cocktail"
          title="しっぽり"
          text="スポーツの後のお酒は最高です。
          
          
          
          "
        ></concept-card>
      </v-col>
    </v-row>
  </v-container>
</template>
<script>
import ConceptCard from "./ConceptCard.vue";
import SubTitle from "./SubTitle.vue";
export default {
  name: "ConceptContents",
  components: {
    SubTitle,
    ConceptCard,
  },
};
</script>
<style>
.secondary-card{
  border-left: 14px solid #182F43 !important;
}
</style>
