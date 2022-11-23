import Vue from "vue";
import App from "./App.vue";
import vuetify from "./plugins/vuetify";
import VueGtm from "@gtm-support/vue2-gtm";

Vue.config.productionTip = false;

new Vue({
  vuetify,
  render: (h) => h(App),
  VueGtm: {
    id: "GTM-WNNF9RP",
  },
}).$mount("#app");
