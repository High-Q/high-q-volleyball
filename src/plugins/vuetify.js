import { createVuetify } from "vuetify";
import "@fortawesome/fontawesome-free/css/all.css";
import { aliases, fa } from "vuetify/iconsets/fa";
import { VCalendar } from "vuetify/labs/VCalendar";

const myCustomTheme = {
  dark: false,
  colors: {
    primary: "#182F43",
    secondary: "#85BBCC",
    third: "#6A96A4",
  },
};

export default createVuetify({
  components: {
    VCalendar,
  },
  icons: {
    defaultSet: "fa",
    aliases,
    sets: {
      fa,
    },
  },
  theme: {
    defaultTheme: "myCustomTheme",
    themes: {
      myCustomTheme,
    },
  },
});
