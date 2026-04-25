<template>
  <div class="vcard" :class="{ 'vcard--secondary': secondary }">
    <div class="vcard-icon-chip">
      <v-icon
        :icon="icon"
        size="32"
        :color="secondary ? 'white' : 'primary'"
      />
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
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  padding: 32px 20px 28px;
  transition: transform 200ms ease-out, box-shadow 200ms ease-out;
}

.vcard:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
}

/* 中央カードは primary 反転で強調 */
.vcard--secondary {
  background: rgb(var(--v-theme-primary));
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.18);
}

.vcard--secondary:hover {
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.24);
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
  background: rgba(255, 255, 255, 0.16);
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

.vcard--secondary .vcard-title,
.vcard--secondary .vcard-text {
  color: #fff;
}

@media (prefers-reduced-motion: reduce) {
  .vcard {
    transition: none;
  }
  .vcard:hover {
    transform: none;
  }
}
</style>
