import "./style.css";
import { createApp } from "vue";
import App from "./App.vue";
import router, { registerAuthGuard } from "./app/router";
import { installAuthSession, useIdleTimeout } from "./features/auth";
import { initSentry } from "./shared/lib/sentry";

const app = createApp(App);
initSentry(app);

// installAuthSession は router guard が inject に依存するため、
// app.use(router) の前に呼ぶ (D4 / D9)。
const session = installAuthSession(app);
registerAuthGuard(router);
app.use(router);

// idle timeout: 15 分の無操作で自動サインアウト (D12)
const idle = useIdleTimeout();
idle.start(() => {
  void session.signOut();
});

app.mount("#app");
