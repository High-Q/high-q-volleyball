<template>
  <!-- <v-card height="400px"> -->
  <v-footer min-height="280" class="footer" height="" padless color="white">
    <v-container fluid>
      <v-row align-content="center" justify="center" justify-md="start">
        <v-col cols="12" md="4">
          <p class="text-h5 text-md-h3 text-center footer-title">High Q</p>
          <v-col>
            <v-row justify="center">
              <v-btn
                class="pa-0"
                height="24"
                width="24"
                min-width="24"
                min-height="24"
                color="#6A96A4"
                href="https://twitter.com/c8w5y"
              >
                <v-icon size="24" color="white">mdi-twitter</v-icon>
              </v-btn>
            </v-row>
          </v-col>
        </v-col>
      </v-row>
    </v-container>
  </v-footer>
</template>

<script>
// import Icons from "./Icons.vue";
export default {
  name: "FooterLine",
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
  text-shadow: 1px 0 0 #85bbcc, 0 1px 0 #85bbcc, -1px 0 0 #85bbcc,
    0 -1px 0 #85bbcc;
  text-align: center;
  font-size: 40px;
  font-weight: bold;
}
.footer {
  background-image: url("../assets/footer.png");
  background-repeat: repeat-x;
}
</style>
