<template>
  <v-card class="ma-0" rounded="sm" color="#ECF2F3" width="374" height="374" outlined>
    <v-container fluid fill-height>
      <v-row align="strech" align-content="center" justify="center">
        <v-col cols="12">
          <v-icon size="100">{{ icon }}</v-icon>
        </v-col>
        <v-col cols="12">
          <v-divider></v-divider>
        </v-col>
        <v-col cols="12">
          <p class="text-h5 ma-0 font-weight-bold">{{ title }}</p>
          <p class="mt-3 mb-0" v-html="htmlText(text)"></p>
        </v-col>
      </v-row>
    </v-container>
  </v-card>
</template>
<script>
export default {
  name: "ConceptCard",
  props: {
    title: String,
    text: String,
    icon: String,
  },
  methods: {
    htmlText(msg) {
      if (msg) {
        return msg.replace(/\r?\n/g, "<br>");
      }
    },
  },
};
</script>
<style>
.theme--light.v-divider {
  border-color: #182f43 !important;
}
.v-card {
  border-left: 14px solid #85bbcc !important;
}
</style>
