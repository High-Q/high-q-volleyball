<template>
  <v-app>
    <link
      href="https://use.fontawesome.com/releases/v5.0.13/css/all.css"
      rel="stylesheet"
    />
    <HeaderLine></HeaderLine>
    <v-content>
      <HomePage></HomePage>
    </v-content>
    <FooterLine></FooterLine>
  </v-app>
</template>

<script>
import HeaderLine from "./components/HeaderLine";
import FooterLine from "./components/FooterLine";
import HomePage from "./pages/HomePage";

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
