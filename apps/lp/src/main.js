import "@high-q/design-tokens/tokens.css";
import App from "./App.vue";
import { createApp } from "vue";
import { registerPlugins } from "@/plugins";
import { initSentry } from "@/shared/lib/sentry";

const app = createApp(App);
initSentry(app);
registerPlugins(app);
app.mount("#app");
