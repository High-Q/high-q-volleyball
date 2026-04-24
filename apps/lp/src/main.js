import App from "./App.vue";
import { createApp } from "vue";
import { registerPlugins } from "@/plugins";

const app = createApp(App);
registerPlugins(app);
app.mount("#app");

//Google Tag Manager
import VueGtm from "vue-gtm";
app.use(VueGtm, {
  id: "GTM-WNNF9RP",
});
