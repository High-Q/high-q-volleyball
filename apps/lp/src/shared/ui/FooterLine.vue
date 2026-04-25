<template>
  <v-footer color="primary" class="py-10">
    <v-container>
      <v-row>
        <!-- カラム1: ブランド -->
        <v-col cols="12" md="6" lg="4">
          <div class="footer-brand text-h5 font-weight-black text-white mb-3">
            High Q
          </div>
          <p class="footer-desc">
            東京都江東区を中心に活動する<br />
            社会人バレーボールサークル
          </p>
        </v-col>

        <!-- カラム2: ナビ -->
        <v-col cols="12" md="6" lg="4">
          <div class="footer-heading">MENU</div>
          <ul class="footer-nav">
            <li><a href="#concept">CONCEPT</a></li>
            <li><a href="#activities">ACTIVITIES</a></li>
            <li><a href="#event">EVENT</a></li>
          </ul>
        </v-col>

        <!-- カラム3: SNS -->
        <v-col cols="12" md="12" lg="4">
          <div class="footer-heading">FOLLOW</div>
          <v-btn
            icon
            variant="text"
            color="white"
            href="https://twitter.com/c8w5y"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="X (Twitter) でフォロー"
          >
            <XIcon :size="20" color="white" />
          </v-btn>
        </v-col>
      </v-row>

      <v-divider class="my-6" color="white" opacity="0.2" />

      <div class="footer-copyright text-center">
        © {{ new Date().getFullYear() }} High Q. All rights reserved.
      </div>
    </v-container>
  </v-footer>
</template>

<script>
import XIcon from "@shared/ui/XIcon.vue";

export default {
  name: "FooterLine",
  components: { XIcon },
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

.footer-heading {
  color: rgb(var(--v-theme-secondary));
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  margin-bottom: 12px;
}

.footer-nav {
  list-style: none;
  padding: 0;
  margin: 0;
}

.footer-nav li {
  margin-bottom: 8px;
}

.footer-nav a {
  color: #fff;
  text-decoration: none;
  font-size: 0.9rem;
  transition: color 150ms ease-out;
}

.footer-nav a:hover {
  color: rgb(var(--v-theme-secondary));
}

.footer-copyright {
  color: rgb(var(--v-theme-text-muted));
  font-size: 0.75rem;
}
</style>
