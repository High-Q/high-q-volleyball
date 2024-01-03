import { createVuetify } from 'vuetify'
import { VCalendar } from 'vuetify/labs/VCalendar'

export default createVuetify({
  components: {
    VCalendar,
  },
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
