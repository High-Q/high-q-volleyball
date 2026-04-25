<template>
  <div class="hero">
    <div class="hero-bg"></div>
    <div class="hero-overlay"></div>
    <div class="hero-content">
      <v-container>
        <p class="hero-title">High Q</p>
        <p class="hero-sub">
          江東区を中心に活動しているバレーボールサークルです！
        </p>
        <p class="hero-body">
          新規メンバーを募集しています。<br />
          20代〜30代の男女、がちがちの初心者の方から中級程度の経験者の方まで幅広くメンバー募集中です。<br />
          上級者のかたもレベルを合わせていただける方は歓迎します！
        </p>
        <div class="hero-cta">
          <v-btn
            color="white"
            variant="outlined"
            size="large"
            href="#event"
            aria-label="イベント一覧へスクロール"
          >
            イベントを見る
          </v-btn>
        </div>
        <p class="hero-notice">メンバー受付窓口は準備中です</p>
      </v-container>
    </div>
    <a class="hero-scroll-hint" href="#concept" aria-label="次のセクションへスクロール">
      <v-icon icon="mdi-chevron-double-down" size="32" aria-hidden="true" />
    </a>
  </div>
</template>

<script>
export default {
  name: "HeroSection",
};
</script>

<style scoped>
.hero {
  position: relative;
  height: 480px;
  overflow: hidden;
  width: 100%;
}

@media (min-width: 960px) {
  .hero {
    height: 560px;
  }
}

/* ぼかした背景画像 */
.hero-bg {
  position: absolute;
  inset: -8px;
  background: url("/chandan-chaurasia-tAcoHIvCtwM-unsplash.jpg") center / cover no-repeat;
  filter: blur(5px);
}

/* 読みやすさのための暗いオーバーレイ */
.hero-overlay {
  position: absolute;
  inset: 0;
  background: rgba(var(--v-theme-primary), 0.58);
}

/* テキストはぼかしの上に表示 */
.hero-content {
  position: relative;
  z-index: 1;
  height: 100%;
  display: flex;
  align-items: center;
}

.hero-title {
  color: #fff;
  font-size: clamp(2.5rem, 8vw, 4.5rem);
  font-weight: 900;
  margin: 0 0 12px;
  line-height: 1.1;
  letter-spacing: 0.02em;
}

.hero-sub {
  color: #fff;
  font-size: clamp(0.9rem, 2.5vw, 1.15rem);
  font-weight: 700;
  margin: 0 0 16px;
  line-height: 1.7;
}

.hero-body {
  color: rgba(255, 255, 255, 0.85);
  font-size: clamp(0.75rem, 2vw, 0.9rem);
  font-weight: 400;
  margin: 0;
  line-height: 1.8;
}

.hero-cta {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 24px;
}

@media (min-width: 600px) {
  .hero-cta {
    flex-direction: row;
    gap: 16px;
  }
}

.hero-notice {
  margin: 12px 0 0;
  color: rgba(255, 255, 255, 0.75);
  font-size: 0.8rem;
  letter-spacing: 0.04em;
}

.hero-scroll-hint {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2;
  color: #fff;
  text-decoration: none;
  animation: hero-bounce 1.6s ease-in-out infinite;
}

@keyframes hero-bounce {
  0%, 100% { transform: translate(-50%, 0); }
  50% { transform: translate(-50%, -8px); }
}

@media (prefers-reduced-motion: reduce) {
  .hero-scroll-hint {
    animation: none;
  }
}
</style>
