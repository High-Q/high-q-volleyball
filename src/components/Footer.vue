<template>
  <v-card height="400px">
    <v-footer padless absolute>
      <v-card flat tile width="100%" class="grey lighten-5 text-center">
        <v-card-text>
          <Icons :icons="icons"></Icons>
        </v-card-text>
        <v-divider></v-divider>
        <v-card-text class="black--text">
          {{ new Date().getFullYear() }} — <strong>High-Q</strong>
        </v-card-text>
      </v-card>
    </v-footer>
  </v-card>
</template>

<script>
import Icons from "./Icons";
export default {
  name: "Footer",
  components: {
    Icons,
  },
  data: () => {
    return {
      icons: ["mdi-home", "mdi-email", "mdi-calendar"],
    };
  },
};
</script>
<style lang="scss" scoped>
.footer_title {
  color: white;
  text-align: center;
  font-size: 28px;
  font-weight: bold;
}
</style>
