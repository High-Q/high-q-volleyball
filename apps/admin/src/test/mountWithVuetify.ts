import { mount, type ComponentMountingOptions } from "@vue/test-utils";
import type { Component } from "vue";
import { createVuetify } from "vuetify";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";

export function mountWithVuetify<TComponent extends Component>(
  component: TComponent,
  options: ComponentMountingOptions<TComponent> = {},
) {
  const vuetify = createVuetify({ components, directives });
  return mount(component, {
    ...options,
    global: {
      ...(options.global ?? {}),
      plugins: [...(options.global?.plugins ?? []), vuetify],
    },
  });
}
