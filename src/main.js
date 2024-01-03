/**
 * main.js
 *
 * Bootstraps Vuetify and other plugins then mounts the App`
 */

// Plugins
import { registerPlugins } from "@/plugins";
// Components
import App from "./App.vue";
// Composables
import { createApp } from "vue";
import "vuetify/styles";
import { createVuetify } from "vuetify";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";

const app = createApp(App);
// Vuetify
const vuetify = createVuetify({
  components,
  directives,
});
app.use(vuetify);
// registerPlugins(app)
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
