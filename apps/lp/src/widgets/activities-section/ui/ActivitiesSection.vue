<template>
  <section ref="el" id="activities" class="activities-section bg-surface-alt" :class="{ 'is-visible': isVisible }">
    <v-container>
      <SubTitle title="Content" />
      <v-row class="mt-4">
        <v-col cols="12" md="6">
          <p class="text-body-1">
            月に1回程度東京都内にてコートを借りて練習します！
            <br />
            人数に合わせて活動回数も増やしていく予定です。
            <br />
            参加希望者や気になった方は
            <br />
            公式 X にて DM で問い合わせください！
          </p>
          <v-btn
            class="mt-4"
            color="third"
            size="large"
            href="https://twitter.com/c8w5y"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="X (Twitter) でお問い合わせ"
          >
            <XIcon :size="18" color="white" />
            <span class="ml-2 text-white">X でお問い合わせ</span>
          </v-btn>
        </v-col>
        <v-col cols="12" md="6">
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
import SubTitle from "@shared/ui/SubTitle.vue";
import XIcon from "@shared/ui/XIcon.vue";
import { useFadeInOnScroll } from "@shared/lib/useFadeInOnScroll";

export default {
  name: "ActivitiesSection",
  components: { SubTitle, XIcon },
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
