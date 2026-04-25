<template>
  <v-app>
    <HeaderLine></HeaderLine>
    <v-main>
      <HomePage></HomePage>
    </v-main>
    <FooterLine></FooterLine>
  </v-app>
</template>

<script>
import HeaderLine from "@shared/ui/HeaderLine.vue";
import FooterLine from "@shared/ui/FooterLine.vue";
import { HomePage } from "@pages/home";

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
