<template>
  <v-app>
    <v-app-bar color="primary">
      <v-row align="center">
        <v-col cols="2" md="9">
          <v-app-bar-title class="header-title">High Q </v-app-bar-title>
        </v-col>
        <v-col>
          <v-row align="center">
            <div style="height: 40px">
              <v-divider vertical class="mx-2" dark></v-divider>
            </div>
            <p class="header-sub-title">江東区<br />バレーボールサークル</p>
          </v-row>
        </v-col>
        <v-spacer></v-spacer>
        <v-btn
          class="mr-4"
          width="60"
          height="60"
          min-width="60"
          min-height="60"
        >
          <v-icon class="fa-brands fa-square-x-twitter fa-2xl"></v-icon>
        </v-btn>
      </v-row>
    </v-app-bar>
  </v-app>
</template>

<script>
export default {
  name: "HeaderLine",
};
</script>
<style lang="scss" scoped>
.header-title {
  color: white;
  text-align: center;
  font-weight: 700;
}
.header-sub-title {
  color: white;
  text-align: center;
  font-size: 8px;
  font-weight: 700;
  margin: 0px;
  text-align: left;
}
</style>
