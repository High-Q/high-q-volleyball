import { mount } from "@vue/test-utils";
import { createVuetify } from "vuetify";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";

export function mountWithVuetify(component, options = {}) {
  const vuetify = createVuetify({ components, directives });
  return mount(component, {
    ...options,
    global: {
      ...(options.global ?? {}),
      plugins: [...(options.global?.plugins ?? []), vuetify],
    },
  });
}
