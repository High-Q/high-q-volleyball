import { describe, expect, it } from "vitest";
import { mountWithRouter } from "@/test/mountWithRouter";
import HomeHeader from "./HomeHeader.vue";

const routes = [
  { path: "/", component: { template: "<div />" } },
  {
    path: "/profile",
    name: "profile",
    component: { template: "<div>profile</div>" },
  },
];

describe("HomeHeader", () => {
  it("ニックネーム頭 1 文字をアバターに描画する", async () => {
    const wrapper = await mountWithRouter(HomeHeader, routes, "/", {
      props: { member: { displayName: "山田 美咲", nickname: "みさき" } },
    });
    expect(wrapper.get('[data-testid="home-header-avatar"]').text()).toBe("み");
  });

  it("ニックネーム未設定時は表示名 (displayName) の頭 1 文字にフォールバックする", async () => {
    const wrapper = await mountWithRouter(HomeHeader, routes, "/", {
      props: { member: { displayName: "山田 美咲", nickname: null } },
    });
    expect(wrapper.get('[data-testid="home-header-avatar"]').text()).toBe("山");
  });

  it("空文字のときはダッシュにフォールバックする", async () => {
    const wrapper = await mountWithRouter(HomeHeader, routes, "/", {
      props: { member: { displayName: "", nickname: null } },
    });
    expect(wrapper.get('[data-testid="home-header-avatar"]').text()).toBe("—");
  });

  it("アバターは /profile への router-link として機能する", async () => {
    const wrapper = await mountWithRouter(HomeHeader, routes, "/", {
      props: { member: { displayName: "山田", nickname: null } },
    });
    const link = wrapper.findComponent({ name: "RouterLink" });
    expect(link.exists()).toBe(true);
    expect(link.props("to")).toEqual({ name: "profile" });
    expect(link.attributes("aria-label")).toBe("プロフィール");
  });

  it("ロゴテキスト (High Q + EST.21) を描画する", async () => {
    const wrapper = await mountWithRouter(HomeHeader, routes, "/", {
      props: { member: { displayName: "山田", nickname: null } },
    });
    expect(wrapper.get('[data-testid="home-header-logo"]').text()).toBe(
      "High Q",
    );
    expect(wrapper.text()).toContain("EST.21");
  });

  it("ロゴ部分は router-link を持たない (押下不可の静的テキスト)", async () => {
    const wrapper = await mountWithRouter(HomeHeader, routes, "/", {
      props: { member: { displayName: "山田", nickname: null } },
    });
    const links = wrapper.findAllComponents({ name: "RouterLink" });
    // ヘッダ内の router-link はアバター 1 件のみ
    expect(links).toHaveLength(1);
    expect(links[0]?.attributes("aria-label")).toBe("プロフィール");
  });
});
