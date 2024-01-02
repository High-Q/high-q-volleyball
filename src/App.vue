<template>
  <v-app>
    <link
      href="https://use.fontawesome.com/releases/v5.0.13/css/all.css"
      rel="stylesheet"
    />
    <HeaderLine></HeaderLine>
    <v-main>
      <HomePage></HomePage>
    </v-main>
    <FooterLine></FooterLine>
  </v-app>
</template>

<script>
import HeaderLine from "./components/HeaderLine.vue";
import FooterLine from "./components/FooterLine.vue";
import HomePage from "./pages/HomePage.vue";

export default {
  // name: 'App',

  components: {
    HeaderLine,
    HomePage,
    FooterLine,
  },

  data: () => ({
    //
  }),
};
</script>
