<template>
  <section ref="el" id="activities" class="activities-section bg-surface-alt" :class="{ 'is-visible': isVisible }">
    <v-container>
      <SectionDivider title="CONTENT" />
      <v-row no-gutters class="mt-4 activities-row">
        <v-col cols="12" md="6" class="activities-col">
          <p class="text-body-1">
            月に1回程度東京都内にてコートを借りて練習します！
            <br />
            人数に合わせて活動回数も増やしていく予定です。
          </p>
          <div class="contact-notice mt-4">
            <p class="contact-notice__title">メンバー受付窓口は準備中です</p>
            <p class="contact-notice__sub">
              現在、お問い合わせ窓口を整備中です。<br />
              準備が整い次第、こちらでご案内いたします。
            </p>
          </div>
        </v-col>
        <v-col cols="12" md="6" class="activities-col">
          <v-img
            src="/chandan-chaurasia-tAcoHIvCtwM-unsplash.jpg"
            rounded="lg"
            cover
            height="280"
            alt="バレーボール活動の様子"
          />
        </v-col>
      </v-row>
    </v-container>
  </section>
</template>

<script>
import SectionDivider from "@shared/ui/SectionDivider.vue";
import { useFadeInOnScroll } from "@shared/lib/useFadeInOnScroll";

export default {
  name: "ActivitiesSection",
  components: { SectionDivider },
  setup() {
    const { el, isVisible } = useFadeInOnScroll();
    return { el, isVisible };
  },
};
</script>

<style scoped>
.activities-section {
  padding: 56px 0;
  scroll-margin-top: 64px;
  opacity: 0;
  transform: translateY(24px);
  transition: opacity 600ms ease-out, transform 600ms ease-out;
}

/* md+ では2カラム間に gap を確保（no-gutters の代替） */
@media (min-width: 960px) {
  .activities-col + .activities-col {
    padding-left: 24px;
  }
}

.contact-notice {
  background: #fff;
  border-radius: 12px;
  padding: 20px 24px;
  border-left: 4px solid rgb(var(--v-theme-secondary));
}

.contact-notice__title {
  font-size: 1rem;
  font-weight: 700;
  color: rgb(var(--v-theme-primary));
  margin: 0 0 6px;
}

.contact-notice__sub {
  font-size: 0.85rem;
  color: rgb(var(--v-theme-text-muted));
  margin: 0;
  line-height: 1.7;
}

.activities-section.is-visible {
  opacity: 1;
  transform: translateY(0);
}

@media (prefers-reduced-motion: reduce) {
  .activities-section {
    opacity: 1;
    transform: none;
    transition: none;
  }
}
</style>
