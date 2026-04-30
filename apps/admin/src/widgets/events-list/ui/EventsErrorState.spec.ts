import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import EventsErrorState from "./EventsErrorState.vue";

describe("EventsErrorState", () => {
  it("role='alert' が付与される", () => {
    const wrapper = mount(EventsErrorState, {
      props: { errorCode: "SERVER_ERROR" },
    });
    expect(wrapper.find('[role="alert"]').exists()).toBe(true);
  });

  it("NETWORK_ERROR 用の文言を表示", () => {
    const wrapper = mount(EventsErrorState, {
      props: { errorCode: "NETWORK_ERROR" },
    });
    expect(wrapper.text()).toContain("通信に失敗しました");
    expect(wrapper.text()).toContain("ERR · supabase / events.list · NETWORK_ERROR");
  });

  it("SERVER_ERROR 用の文言を表示", () => {
    const wrapper = mount(EventsErrorState, {
      props: { errorCode: "SERVER_ERROR" },
    });
    expect(wrapper.text()).toContain("イベントを読み込めませんでした");
    expect(wrapper.text()).toContain("SERVER_ERROR");
  });

  it("PERMISSION_DENIED 用の文言を表示", () => {
    const wrapper = mount(EventsErrorState, {
      props: { errorCode: "PERMISSION_DENIED" },
    });
    expect(wrapper.text()).toContain("アクセス権限がありません");
  });

  it("再試行ボタン押下で retry emit", async () => {
    const wrapper = mount(EventsErrorState, {
      props: { errorCode: "SERVER_ERROR" },
    });
    await wrapper.find("button").trigger("click");
    expect(wrapper.emitted("retry")).toBeDefined();
  });
});
