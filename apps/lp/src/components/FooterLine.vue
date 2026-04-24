<template>
  <v-footer color="primary" class="py-10">
    <v-container>
      <div class="text-center">
        <div class="text-h5 font-weight-black text-white mb-4" style="letter-spacing: 0.05em;">
          High Q
        </div>
        <v-btn
          icon
          variant="text"
          color="secondary"
          href="https://twitter.com/c8w5y"
          target="_blank"
          aria-label="X (Twitter)"
        >
          <v-icon>mdi-twitter</v-icon>
        </v-btn>
        <div class="text-caption mt-4" style="color: #6A96A4;">
          © {{ new Date().getFullYear() }} High Q. All rights reserved.
        </div>
      </div>
    </v-container>
  </v-footer>
</template>

<script>
export default { name: "FooterLine" };
</script>
