import { describe, expect, it } from "vitest";
import App from "./App.vue";
import { mountWithVuetify } from "./test/mountWithVuetify";

describe("App", () => {
  it("renders root heading", () => {
    const wrapper = mountWithVuetify(App);
    expect(wrapper.exists()).toBe(true);
    expect(wrapper.find("h1").text()).toContain("管理画面");
  });
});
