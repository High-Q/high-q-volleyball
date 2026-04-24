<template>
  <v-app-bar color="primary" elevation="0" flat>
    <v-app-bar-title>
      <span class="text-h6 font-weight-bold text-white">High Q</span>
    </v-app-bar-title>
    <template #append>
      <v-btn
        icon
        variant="text"
        color="white"
        href="https://twitter.com/c8w5y"
        target="_blank"
        aria-label="X (Twitter)"
      >
        <v-icon>mdi-twitter</v-icon>
      </v-btn>
    </template>
  </v-app-bar>
</template>

<script>
export default { name: "HeaderLine" };
</script>
