/**
 * plugins/index.js
 *
 * Automatically included in `./src/main.js`
 */

// Plugins
import vuetify from './vuetify'
import { VueQueryPlugin } from '@tanstack/vue-query'

export function registerPlugins (app) {
  app.use(vuetify)
  app.use(VueQueryPlugin)
}
