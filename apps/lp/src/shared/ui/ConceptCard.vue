<template>
  <div class="vcard" :class="{ 'vcard--secondary': secondary }">
    <div class="vcard-accent" />
    <div class="vcard-icon-chip">
      <v-icon :icon="icon" size="32" color="primary" />
    </div>
    <div class="vcard-body">
      <p class="vcard-title">{{ title }}</p>
      <p class="vcard-text" v-html="htmlText(text)"></p>
    </div>
  </div>
</template>

<script>
export default {
  name: "ConceptCard",
  props: {
    title: String,
    text: String,
    icon: String,
    secondary: { type: Boolean, default: false },
  },
  methods: {
    htmlText(msg) {
      if (!msg) return "";
      return msg.trim().replace(/\r?\n\s*/g, "<br>");
    },
  },
};
</script>

<style scoped>
.vcard {
  position: relative;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  padding: 32px 20px 28px;
  overflow: hidden;
}

/* 中央カードは secondary（水色）背景でサンドイッチ強調 */
.vcard--secondary {
  background: rgb(var(--v-theme-secondary));
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.18);
}

/* 全カード上端のアクセントバー（通常: secondary / 中央: primary で反転） */
.vcard-accent {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: rgb(var(--v-theme-secondary));
}

.vcard--secondary .vcard-accent {
  background: rgb(var(--v-theme-primary));
}

.vcard-icon-chip {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: rgb(var(--v-theme-surface-alt));
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}

.vcard--secondary .vcard-icon-chip {
  background: #fff;
}

.vcard-body {
  text-align: center;
}

.vcard-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: rgb(var(--v-theme-primary));
  margin: 0 0 10px;
  line-height: 1.4;
}

.vcard-text {
  font-size: 0.85rem;
  color: rgb(var(--v-theme-primary));
  margin: 0;
  line-height: 1.8;
}
</style>
