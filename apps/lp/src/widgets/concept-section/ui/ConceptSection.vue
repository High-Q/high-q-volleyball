<template>
  <section
    ref="el"
    id="concept"
    class="advantages-section"
    :class="{ 'is-visible': isVisible }"
  >
    <v-container>
      <h2 class="section-title">ADVANTAGES</h2>
      <div class="section-hr"></div>

      <div class="concept-grid">
        <ConceptCard
          v-for="(card, i) in cards"
          :key="card.icon"
          :icon="card.icon"
          :title="card.title"
          :text="card.text"
          :secondary="i === 1"
        />
      </div>
    </v-container>
  </section>
</template>

<script>
import ConceptCard from "@shared/ui/ConceptCard.vue";
import { useFadeInOnScroll } from "@shared/lib/useFadeInOnScroll";

export default {
  name: "ConceptSection",
  components: { ConceptCard },
  setup() {
    const { el, isVisible } = useFadeInOnScroll();
    return { el, isVisible };
  },
  data: () => ({
    cards: [
      {
        icon: "mdi-account-group-outline",
        title: "notガチ勢 butエンジョイ勢",
        text: "ラリーが続かなくてもOK！\nレシーブやスパイクができるまで\nのびのびやりましょう。\n主幹事も頑張ってレクチャーします。",
      },
      {
        icon: "mdi-hand-wave-outline",
        title: "行きたいときだけ来ればいい",
        text: "週一でも年一でも、ほんとのたま〜にでも来てもらえるだけで嬉しいです！いつでもふらっと来てください。",
      },
      {
        icon: "mdi-glass-mug-variant",
        title: "しっぽり",
        text: "スポーツの後のお酒は最高です。",
      },
    ],
  }),
};
</script>

<style scoped>
.advantages-section {
  padding: 56px 0 64px;
  background: #fff;
  opacity: 0;
  transform: translateY(24px);
  transition: opacity 600ms ease-out, transform 600ms ease-out;
}

.advantages-section.is-visible {
  opacity: 1;
  transform: translateY(0);
}

@media (prefers-reduced-motion: reduce) {
  .advantages-section {
    opacity: 1;
    transform: none;
    transition: none;
  }
}

.section-title {
  font-size: 2rem;
  font-weight: 900;
  color: rgb(var(--v-theme-primary));
  letter-spacing: 0.06em;
  margin: 0 0 14px;
}

.section-hr {
  width: 100%;
  height: 2px;
  background: rgb(var(--v-theme-primary));
  margin-bottom: 40px;
}

/* CSS Grid で確実に3列 */
.concept-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

/* スマホは1列 */
@media (max-width: 599px) {
  .concept-grid {
    grid-template-columns: 1fr;
  }
}
</style>
