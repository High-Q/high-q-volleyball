<template>
  <v-img
    src="../assets/chandan-chaurasia-tAcoHIvCtwM-unsplash.jpg"
    width="1440"
    height="605"
  >
    <v-container fluid fill-height class="main_image_container">
      <v-row no-gutters>
        <v-col cols="8"> </v-col>
        <v-col cols="4">
          <p class="main-visual-title">High Q</p>
          <p class="main-visual-text">
            江東区を中心に活動している<br />
            バレーボールサークルです！
          </p>
        </v-col>
      </v-row>
      <v-row no-gutters>
        <v-col cols="8"> </v-col>
        <v-col cols="4">
          <p class="main-visual-text">
            立ち上げに伴って、メンバーを募集しています<br />
            20代〜30代の男女、<br />
            がちがちの初心者の方から経験者の方まで<br />
            幅広くメンバー募集中です
          </p>
        </v-col>
      </v-row>
      <v-row></v-row>
      <v-row></v-row>      
      <v-row></v-row>
      <v-row></v-row>
    </v-container>
  </v-img>
</template>
<script>
export default {
  name: "MainImage",
};
</script>

<style lang="scss" scoped>
.main_image_container {
  background: rgba(106, 150, 164, 0.3);
  backdrop-filter: blur(3.5px);
}
.main-visual-title {
  color: white;
  text-align: left;
  font-size: 84px;
  font-weight: bold;
}
.main-visual-text {
  color: white;
  text-align: left;
  font-size: 16px;
  font-weight: bold;
}
</style>
