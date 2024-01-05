/**
 * main.js
 *
 * Bootstraps Vuetify and other plugins then mounts the App`
 */

// Components
import App from "./App.vue";
// Composables
import { createApp } from "vue";
import "vuetify/styles";
import { createVuetify } from "vuetify";
// Plugins
import { registerPlugins } from "@/plugins";

const app = createApp(App);
// Vuetify
const vuetify = createVuetify({});
app.use(vuetify);
registerPlugins(app);
app.mount("#app");

/* ここより以下の箇所は回収が必要*/
//Vue2 Hammer
import { VueHammer } from "vue2-hammer";
import Hammer from "hammerjs";
VueHammer.config.swipe = {
  direction: Hammer.DIRECTION_HORIZONTAL,
};
app.config.productionTip = false;
app.use(VueHammer);

//Google Tag Manager
import VueGtm from "vue-gtm";
app.use(VueGtm, {
  id: "GTM-WNNF9RP",
});
