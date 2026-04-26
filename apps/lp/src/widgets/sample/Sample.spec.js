import { describe, expect, it } from "vitest";
import Sample from "./Sample.vue";
import { mountWithVuetify } from "../../test/mountWithVuetify.js";

describe("SampleWidget", () => {
  it("renders title and message via Vuetify", () => {
    const wrapper = mountWithVuetify(Sample, {
      props: { title: "Hello", message: "World" },
    });
    expect(wrapper.exists()).toBe(true);
    expect(wrapper.text()).toContain("Hello");
    expect(wrapper.text()).toContain("World");
  });
});
