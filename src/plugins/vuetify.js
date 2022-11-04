import Vue from 'vue';
import Vuetify from 'vuetify/lib';

Vue.use(Vuetify);

export default new Vuetify({

    theme: {
        themes: {
          light: {
            primary: '#182F43',
            secondary: '#85BBCC',
            third: '#6A96A4',
          },
        },
        // options: { customProperties: true },
      },
});
