<template>
  <div class="hero">
    <div class="hero-bg"></div>
    <div class="hero-overlay"></div>
    <div class="hero-content">
      <v-container>
        <p class="hero-title">High Q</p>
        <p class="hero-sub">
          江東区を中心に活動している<br />
          バレーボールサークルです！
        </p>
        <p class="hero-body">
          立ち上げに伴って、メンバーを募集しています<br />
          20代〜30代の男女、<br />
          がちがちの初心者の方から経験者の方まで<br />
          幅広くメンバー募集中です
        </p>
      </v-container>
    </div>
  </div>
</template>

<script>
export default { name: "MainImage" };
</script>

<style scoped>
.hero {
  position: relative;
  height: 480px;
  overflow: hidden;
  width: 100%;
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
  background: rgba(24, 47, 67, 0.58);
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
</style>
