<template>
  <v-container fluid fill-height class="main_image_content">
    <v-row> </v-row>
    <v-row class="white--text">
      <v-col class="main_image-text" align="center">
        <p class="text-h5 font-weight-bold">
          江東区
          <br />
          バレーボールサークル
        </p>
        <p class="text-h4 font-weight-bold">High Q</p>
      </v-col>
    </v-row>
    <v-row class="white--text">
      <v-col class="main_image-text" align="center">
        <p class="body-1 font-weight-bold">
          江東区を中心に活動を予定している
          <br />
          バレーボールサークルです！
          <br />
          立ち上げに伴って、
          <br />
          メンバーを募集しています。
          <br />
          20代〜30代男女、
          <br />
          がちがちの初心者の方から経験者の方まで
          <br />
          幅広くメンバー募集中です。
        </p>
      </v-col>
    </v-row>
  </v-container>
</template>
<script>
export default {
  name: "MainImage",
};
</script>

<style lang="scss" scoped>
.main_image_content {
  background: url("../assets/chandan-chaurasia-tAcoHIvCtwM-unsplash.jpg");
  background-size: cover;
  background-position: center;
  width: 100%;
  height: 75vh;
}
</style>
