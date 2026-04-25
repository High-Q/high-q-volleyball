import "vuetify/styles";
import { createVuetify } from "vuetify";
import { aliases, mdi } from "vuetify/iconsets/mdi";

const myCustomTheme = {
  dark: false,
  colors: {
    primary:       "#182F43", // ブランド主色（ヘッダー・見出し・強調テキスト）
    secondary:     "#85BBCC", // ブランドアクセント（CTA・カレンダー・ハイライト）
    third:         "#6A96A4", // 中間色（補助ボタン等）
    "surface-alt": "#F5F8FA", // セクション交互背景（Activities 等）
    "text-muted":  "#6A96A4", // 補助テキスト（フッター著作権等）
  },
};

export default createVuetify({
  icons: {
    defaultSet: "mdi",
    aliases,
    sets: { mdi },
  },
  theme: {
    defaultTheme: "myCustomTheme",
    themes: {
      myCustomTheme,
    },
  },
});
