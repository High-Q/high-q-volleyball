import { mount, flushPromises } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import { createMemoryHistory, createRouter, type Router } from "vue-router";

const { getEventByIdMock, useVenuesMock, useVolumeSuggestMock, suggestNextVolumeMock } =
  vi.hoisted(() => ({
    getEventByIdMock: vi.fn(),
    useVenuesMock: vi.fn(),
    useVolumeSuggestMock: vi.fn(),
    suggestNextVolumeMock: vi.fn(),
  }));

vi.mock("@/entities/event", async () => {
  const actual = await vi.importActual<typeof import("@/entities/event")>(
    "@/entities/event",
  );
  return {
    ...actual,
    getEventById: getEventByIdMock,
  };
});

vi.mock("@/entities/venue", () => ({
  useVenues: useVenuesMock,
}));

vi.mock("@/widgets/event-form/composables/useVolumeSuggest", () => ({
  useVolumeSuggest: useVolumeSuggestMock,
  suggestNextVolume: suggestNextVolumeMock,
}));

import EventCreatePage from "./EventCreatePage.vue";
import type { Event } from "@high-q/shared";

const VENUE_ID = "11111111-1111-4111-8111-111111111111";
const EVENT_ID = "22222222-2222-4222-8222-222222222222";

const SAMPLE_EVENT: Event = {
  id: EVENT_ID as unknown as Event["id"],
  name: "ゆる練 vol.42",
  description: null,
  start_at: "2026-05-12T19:30:00+09:00",
  end_at: "2026-05-12T21:30:00+09:00",
  venue_id: VENUE_ID as unknown as Event["venue_id"],
  fee: 1000,
  capacity: null,
  visibility: "published",
  status: "scheduled",
  cancel_deadline: null,
  created_by: null,
  created_at: "2026-05-01T00:00:00Z",
  updated_at: "2026-05-01T00:00:00Z",
};

function buildRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/events", name: "events", component: { template: "<div />" } },
      {
        path: "/events/new",
        name: "events-new",
        component: { template: "<div />" },
      },
    ],
  });
}

beforeEach(() => {
  useVenuesMock.mockReturnValue({
    venues: ref([{ id: VENUE_ID, name: "亀戸スポーツセンター" }]),
    reload: vi.fn(),
  });
  useVolumeSuggestMock.mockReturnValue({ suggestion: ref(undefined) });
  suggestNextVolumeMock.mockResolvedValue("ゆる練 vol.46");
});

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

describe("EventCreatePage — from なし（従来の新規作成）", () => {
  it("EventForm を mode='create' でマウントし、複製の手がかりは出ない", async () => {
    const router = buildRouter();
    await router.push("/events/new");
    await router.isReady();
    const wrapper = mount(EventCreatePage, { global: { plugins: [router] } });
    await flushPromises();
    const text = wrapper.text();
    expect(text).toContain("新規イベント");
    expect(text).toContain("キャンセル");
    expect(text).toContain("保存");
    expect(text).not.toContain("削除");
    expect(text).not.toContain("複製して作成中");
  });
});

describe("EventCreatePage — from 指定（複製）", () => {
  it("取得成功で会場・時間・参加費をシードし、開催日は空、手がかりを表示する", async () => {
    getEventByIdMock.mockResolvedValue({ ok: true, value: SAMPLE_EVENT });
    const router = buildRouter();
    await router.push(`/events/new?from=${EVENT_ID}`);
    await router.isReady();
    const wrapper = mount(EventCreatePage, { global: { plugins: [router] } });
    await flushPromises();

    expect(wrapper.text()).toContain("複製して作成中");
    expect(wrapper.text()).toContain("ゆる練 vol.42");

    const inputValues = wrapper.findAll("input").map((i) => i.element.value);
    // 連番採番（全体最大+1）でタイトルがシードされる
    expect(inputValues).toContain("ゆる練 vol.46");
    // 参加費は複製元から引き継ぐ
    expect(inputValues).toContain("1000");
    // 開催日は空のままシードされる（複製元の 2026-05-12 は入らない）
    expect(inputValues).not.toContain("2026-05-12");

    // 時刻（時/分の select）と会場は複製元から引き継ぐ
    const selectValues = wrapper.findAll("select").map((s) => s.element.value);
    expect(selectValues).toContain("19"); // 開始 時
    expect(selectValues).toContain("21"); // 終了 時
    expect(selectValues).toContain(VENUE_ID); // 会場
  });

  it("取得失敗（ok:false）はシードなしの通常フォームにフォールバックする", async () => {
    getEventByIdMock.mockResolvedValue({
      ok: false,
      error: { code: "PERMISSION_DENIED", message: "rls" },
    });
    const router = buildRouter();
    await router.push(`/events/new?from=${EVENT_ID}`);
    await router.isReady();
    const wrapper = mount(EventCreatePage, { global: { plugins: [router] } });
    await flushPromises();

    expect(wrapper.text()).toContain("新規イベント");
    expect(wrapper.text()).not.toContain("複製して作成中");
  });

  it("複製元が見つからない（null）場合もフォールバックする", async () => {
    getEventByIdMock.mockResolvedValue({ ok: true, value: null });
    const router = buildRouter();
    await router.push(`/events/new?from=${EVENT_ID}`);
    await router.isReady();
    const wrapper = mount(EventCreatePage, { global: { plugins: [router] } });
    await flushPromises();

    expect(wrapper.text()).toContain("新規イベント");
    expect(wrapper.text()).not.toContain("複製して作成中");
  });
});
