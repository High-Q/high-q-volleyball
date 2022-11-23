import Vue from "vue";
import App from "./App.vue";
import vuetify from "./plugins/vuetify";
import VueGtm from 'vue-gtm';

Vue.config.productionTip = false;

new Vue({
  vuetify,
  render: (h) => h(App),
}).$mount("#app");

Vue.use(VueGtm, {
  id: 'GTM-WNNF9RP',
});

