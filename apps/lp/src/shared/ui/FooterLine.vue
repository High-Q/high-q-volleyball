<template>
  <v-footer color="primary" class="py-10">
    <v-container>
      <div class="footer-brand text-h5 font-weight-black text-white mb-2">
        High Q
      </div>
      <p class="footer-desc">
        東京都江東区を中心に活動する社会人バレーボールサークル
      </p>

      <v-divider class="my-6" color="white" opacity="0.2" />

      <div class="footer-copyright text-center">
        © {{ new Date().getFullYear() }} High Q. All rights reserved.
      </div>
    </v-container>
  </v-footer>
</template>

<script>
export default {
  name: "FooterLine",
};
</script>

<style scoped>
.footer-brand {
  letter-spacing: 0.05em;
}

.footer-desc {
  color: rgba(255, 255, 255, 0.85);
  font-size: 0.85rem;
  line-height: 1.7;
  margin: 0;
}

.footer-copyright {
  color: #fff;
  font-size: 0.75rem;
}
</style>
