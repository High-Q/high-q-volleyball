<template>
  <!-- <v-card height="400px"> -->
  <v-footer padless height="400" color="white">
    <v-row no-gutters>
      <v-col cols="4">
        <v-img src="../assets/footer.png">
          <v-container fluid fill-height>
            <v-row align-content="center" justify="center">
              <v-col cols="12">
                <h3 class="footer-title">High Q</h3>
              </v-col>
              <v-btn
                class="mr-4"
                width="44"
                height="44"
                min-width="44"
                min-height="44"
                color="#6A96A4"
                href="https://twitter.com/c8w5y"
              >
                <v-icon size="44" color="white" large>mdi-twitter</v-icon>
              </v-btn>
              <v-btn
                class="mr-4"
                width="44"
                height="44"
                min-width="44"
                min-height="44"
                color="#6A96A4"
                icon
                href="https://www.instagram.com/hiyori0104/"
              >
                <v-icon size="58">mdi-instagram</v-icon>
              </v-btn>
            </v-row>
          </v-container>
        </v-img>
      </v-col>
      <v-col cols="4" class="mx-n2">
        <v-img src="../assets/footer.png"> </v-img>
      </v-col>
      <v-col cols="4">
        <v-img src="../assets/footer.png"> </v-img>
      </v-col>
    </v-row>
  </v-footer>
</template>

<script>
// import Icons from "./Icons";
export default {
  name: "Footer",
  components: {
    // Icons,
  },
  data: () => {
    return {
      icons: ["mdi-home", "mdi-email", "mdi-calendar"],
    };
  },
};
</script>
<style>
.footer-title {
  color: #182f43;
  /* border: 1px solid #85BBCC; */
  text-shadow: 1px 0 0 #85BBCC, 0 1px 0 #85BBCC, -1px 0 0 #85BBCC, 0 -1px 0 #85BBCC;
  text-align: center;
  font-size: 40px;
  font-weight: bold;
}
</style>
