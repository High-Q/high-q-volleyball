import "./style.css";
import { createApp } from "vue";
import App from "./App.vue";
import router, { registerAuthGuard } from "./app/router";
import { installAuthSession } from "./features/auth";
import { initSentry } from "./shared/lib/sentry";

const app = createApp(App);
initSentry(app);

// installAuthSession は router guard が inject に依存するため、
// app.use(router) の前に呼ぶ必要がある (design.md D5)。
installAuthSession(app);
registerAuthGuard(router);
app.use(router);

app.mount("#app");
