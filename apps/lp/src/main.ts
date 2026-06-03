import "@high-q/design-tokens/tokens.css";
import "./style.css";
import { createApp } from "vue";
import { VueQueryPlugin } from "@tanstack/vue-query";
import App from "./App.vue";
import { initSentry } from "@/shared/lib/sentry";

const app = createApp(App);
initSentry(app);
app.use(VueQueryPlugin);
app.mount("#app");
