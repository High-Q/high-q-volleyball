<template>
  <v-container fluid fill-height>
    <v-row justify="center" class="pa-md-16">
      <SubTitle title="High-Q's concept"></SubTitle>
    </v-row>
    <v-row no-gutters justify="center">
      <v-col align="center" class="pa-8" cols="12" md="4">
        <v-icon size="80">far fa-handshake</v-icon>
        <p class="text-h6 font-weight-bold">not ガチ勢 but エンジョイ勢</p>
        <p>
          ラリーが続かなくてもOK！
          <br />
          レシーブやスパイクができるまでのびのびやりましょう。
          <br />
          主幹事も頑張ってレクチャーします。
        </p>
      </v-col>
      <v-col align="center" class="pa-8" cols="12" md="4">
        <v-icon size="80">fas fa-circle-notch</v-icon>
        <p class="text-h6 font-weight-bold">・・・！！！！上ッ！</p>
        <p>
          ・・・突然の視力検査ッ
          <br />
          <br />
        </p>
      </v-col>
      <v-col align="center" class="pa-8" cols="12" md="4">
        <v-icon size="80">mdi-glass-cocktail</v-icon>
        <p class="text-h6 font-weight-bold">しっぽり</p>
        <p>
          スポーツの後のお酒は最高です。
          <br />
          しっぽり上品に親睦を深めましょう！
          <br />
          馬鹿騒ぎする人は速やかに帰りましょう。
        </p>
      </v-col>
    </v-row>
  </v-container>
</template>
<script>
import SubTitle from "./SubTitle.vue";
export default {
  name: "Concept",
  components: {
    SubTitle,
  }
};
</script>