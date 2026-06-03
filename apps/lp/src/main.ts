import "@high-q/design-tokens/tokens.css";
import "./style.css";
import { createApp } from "vue";
import App from "./App.vue";
import { initSentry } from "@/shared/lib/sentry";

const app = createApp(App);
initSentry(app);
app.mount("#app");
