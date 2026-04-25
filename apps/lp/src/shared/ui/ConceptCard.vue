<template>
  <div class="vcard" :class="{ 'vcard--secondary': secondary }">
    <div class="vcard-icon">
      <v-icon :icon="icon" size="80" color="primary"></v-icon>
    </div>
    <div class="vcard-divider"></div>
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
  background: #ECF2F3;
  border-left: 10px solid rgb(var(--v-theme-secondary));
  display: flex;
  flex-direction: column;
  height: 100%;
}

/* 中央カードは濃い navy ボーダー */
.vcard--secondary {
  border-left-color: rgb(var(--v-theme-primary));
}

.vcard-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 36px 24px 28px;
}

.vcard-divider {
  height: 2px;
  background: rgb(var(--v-theme-primary));
  margin: 0 16px;
}

.vcard-body {
  padding: 20px 20px 28px;
  text-align: center;
}

.vcard-title {
  font-size: 1rem;
  font-weight: 700;
  color: rgb(var(--v-theme-primary));
  margin: 0 0 10px;
  line-height: 1.4;
}

.vcard-text {
  font-size: 0.82rem;
  color: rgb(var(--v-theme-primary));
  margin: 0;
  line-height: 1.8;
}
</style>
