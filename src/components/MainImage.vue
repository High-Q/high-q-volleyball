<template>
  <v-container fluid pa-0>
    <v-img
      height="605"
      src="/chandan-chaurasia-tAcoHIvCtwM-unsplash.jpg"
    >
      <v-container fluid fill-height class="main_image_container">
        <v-row no-gutters align-content="center" justify="space-around">
          <v-col cols="12" md="8"> </v-col>
          <v-col cols="12" md="4">
            <p class="main-visual-title text-center text-h3 text-md-h1">
              High Q
            </p>
            <p class="main-visual-text text-center text-subtitle-2 text-md-subtitle-1">
              江東区を中心に活動している<br />
              バレーボールサークルです！
            </p>
          </v-col>
          <v-col cols="12" md="8"> </v-col>
          <v-col cols="12" md="4">
            <p class="main-visual-text text-center text-subtitle-2 text-md-subtitle-1">
              立ち上げに伴って、メンバーを募集しています<br />
              20代〜30代の男女、<br />
              がちがちの初心者の方から経験者の方まで<br />
              幅広くメンバー募集中です
            </p>
          </v-col>
        </v-row>
      </v-container>
    </v-img>
  </v-container>
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
  font-weight: bold;
}
.main-visual-text {
  color: white;
  text-align: left;
  font-weight: bold;
}
</style>
