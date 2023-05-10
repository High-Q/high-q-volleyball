import Vue from "vue";
import App from "./App.vue";
import vuetify from "./plugins/vuetify";
import VueGtm from 'vue-gtm';
import { VueHammer } from 'vue2-hammer';

Vue.config.productionTip = false;
Vue.use(VueHammer);

new Vue({
  vuetify,
  render: (h) => h(App),
}).$mount("#app");

Vue.use(VueGtm, {
  id: 'GTM-WNNF9RP',
});
