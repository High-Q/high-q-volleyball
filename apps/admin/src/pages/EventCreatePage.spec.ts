import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";

const { useVenuesMock, useVolumeSuggestMock } = vi.hoisted(() => ({
  useVenuesMock: vi.fn(),
  useVolumeSuggestMock: vi.fn(),
}));

vi.mock("@/entities/venue", () => ({
  useVenues: useVenuesMock,
}));

vi.mock("@/widgets/event-form/composables/useVolumeSuggest", () => ({
  useVolumeSuggest: useVolumeSuggestMock,
}));

import EventCreatePage from "./EventCreatePage.vue";

beforeEach(() => {
  useVenuesMock.mockReturnValue({ venues: ref([]), reload: vi.fn() });
  useVolumeSuggestMock.mockReturnValue({ suggestion: ref(undefined) });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("EventCreatePage", () => {
  it("EventForm を mode='create' でマウントする", async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/events", component: { template: "<div />" } },
        { path: "/events/new", component: { template: "<div />" } },
      ],
    });
    await router.push("/events/new");
    await router.isReady();
    const wrapper = mount(EventCreatePage, { global: { plugins: [router] } });
    const text = wrapper.text();
    expect(text).toContain("新規イベント");
    expect(text).toContain("キャンセル");
    expect(text).toContain("保存");
    expect(text).not.toContain("削除");
  });
});
