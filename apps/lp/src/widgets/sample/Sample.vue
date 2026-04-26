<template>
  <v-card class="sample-card">
    <v-card-title>{{ title }}</v-card-title>
    <v-card-text>{{ message }}</v-card-text>
  </v-card>
</template>

<script>
export default {
  name: "SampleWidget",
  props: {
    title: { type: String, default: "High Q Sample" },
    message: { type: String, default: "Vitest baseline OK" },
  },
};
</script>
