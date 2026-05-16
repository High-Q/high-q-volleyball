import "vuetify/styles";
import { createVuetify } from "vuetify";
import { aliases, mdi } from "vuetify/iconsets/mdi";

const hqTheme = {
  dark: false,
  colors: {
    background: "#f7f3ea",
    surface: "#fbf8f1",
    primary: "#1f1d1a",
    secondary: "#3a3833",
    accent: "#b85c3c",
    error: "#9c4030",
    info: "#3a3833",
    success: "#6b7e4f",
    warning: "#c08442",
  },
};

export default createVuetify({
  icons: {
    defaultSet: "mdi",
    aliases,
    sets: { mdi },
  },
  theme: {
    defaultTheme: "hqTheme",
    themes: { hqTheme },
  },
});
