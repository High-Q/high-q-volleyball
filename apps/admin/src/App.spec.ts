import { describe, expect, it } from "vitest";
import App from "./App.vue";
import HomePlaceholder from "./pages/HomePlaceholder.vue";
import LoginPlaceholder from "./pages/LoginPlaceholder.vue";
import { mountWithRouter } from "./test/mountWithRouter";

const routes = [
  { path: "/", name: "home", component: HomePlaceholder },
  { path: "/login", name: "login", component: LoginPlaceholder },
];

describe("App routing smoke", () => {
  it("'/' で HomePlaceholder が描画される", async () => {
    const wrapper = await mountWithRouter(App, routes, "/");
    expect(wrapper.findComponent(HomePlaceholder).exists()).toBe(true);
    expect(wrapper.text()).toContain("管理画面");
  });

  it("'/login' で LoginPlaceholder が描画される", async () => {
    const wrapper = await mountWithRouter(App, routes, "/login");
    expect(wrapper.findComponent(LoginPlaceholder).exists()).toBe(true);
    expect(wrapper.text()).toContain("ログイン");
  });
});
