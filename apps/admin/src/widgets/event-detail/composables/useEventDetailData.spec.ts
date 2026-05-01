import { mount, flushPromises, type VueWrapper } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, ref } from "vue";
import type { EventId } from "@high-q/shared";

const { getEventDetailMock } = vi.hoisted(() => ({
  getEventDetailMock: vi.fn(),
}));

vi.mock("@/entities/event-detail", () => ({
  getEventDetail: getEventDetailMock,
}));

import { useEventDetailData } from "./useEventDetailData";

const EVENT_ID = "00000000-0000-0000-0000-000000000001" as unknown as EventId;
let wrapper: VueWrapper | null = null;

async function setup(idValue: EventId | null = EVENT_ID) {
  let captured!: ReturnType<typeof useEventDetailData>;
  const idRef = ref<EventId | null>(idValue);
  const Harness = defineComponent({
    setup() {
      captured = useEventDetailData(idRef);
      return () => h("div");
    },
  });
  wrapper = mount(Harness);
  await flushPromises();
  return { composable: captured, idRef };
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
});

describe("useEventDetailData — 取得", () => {
  it("eventId で getEventDetail を呼ぶ", async () => {
    getEventDetailMock.mockResolvedValue({
      ok: true,
      value: { id: EVENT_ID, name: "test" },
    });
    await setup();
    expect(getEventDetailMock).toHaveBeenCalledWith(EVENT_ID);
  });

  it("成功時に data がセットされる", async () => {
    getEventDetailMock.mockResolvedValue({
      ok: true,
      value: {
        id: EVENT_ID,
        name: "ゆる練 vol.42",
        capacity: null,
        reserved_count: 16,
        checked_in_count: 4,
      },
    });
    const { composable } = await setup();
    expect(composable.data.value?.name).toBe("ゆる練 vol.42");
    expect(composable.isError.value).toBe(false);
  });
});

describe("useEventDetailData — エラー", () => {
  it("EVENT_NOT_FOUND で isError=true + errorCode='EVENT_NOT_FOUND'", async () => {
    getEventDetailMock.mockResolvedValue({
      ok: false,
      error: { code: "EVENT_NOT_FOUND", message: "" },
    });
    const { composable } = await setup();
    expect(composable.isError.value).toBe(true);
    expect(composable.errorCode.value).toBe("EVENT_NOT_FOUND");
    expect(composable.data.value).toBeNull();
  });

  it("NETWORK_ERROR でも isError=true", async () => {
    getEventDetailMock.mockResolvedValue({
      ok: false,
      error: { code: "NETWORK_ERROR", message: "" },
    });
    const { composable } = await setup();
    expect(composable.isError.value).toBe(true);
    expect(composable.errorCode.value).toBe("NETWORK_ERROR");
  });
});

describe("useEventDetailData — refetch / eventId 変更", () => {
  it("refetch で再取得する", async () => {
    getEventDetailMock.mockResolvedValue({
      ok: true,
      value: { id: EVENT_ID },
    });
    const { composable } = await setup();
    expect(getEventDetailMock).toHaveBeenCalledTimes(1);
    await composable.refetch();
    expect(getEventDetailMock).toHaveBeenCalledTimes(2);
  });
});

describe("useEventDetailData — applyDeltas", () => {
  it("チェックイン delta を適用", async () => {
    getEventDetailMock.mockResolvedValue({
      ok: true,
      value: {
        id: EVENT_ID,
        checked_in_count: 4,
        reserved_count: 16,
      },
    });
    const { composable } = await setup();
    composable.applyDeltas({ checkin: 1 });
    expect(composable.data.value?.checked_in_count).toBe(5);
    composable.applyDeltas({ checkin: -1 });
    expect(composable.data.value?.checked_in_count).toBe(4);
  });

  it("reserved_count delta を適用（キャンセル代行用）", async () => {
    getEventDetailMock.mockResolvedValue({
      ok: true,
      value: {
        id: EVENT_ID,
        checked_in_count: 4,
        reserved_count: 16,
      },
    });
    const { composable } = await setup();
    composable.applyDeltas({ reserved: -1 });
    expect(composable.data.value?.reserved_count).toBe(15);
  });

  it("data が null なら applyDeltas は何もしない", async () => {
    getEventDetailMock.mockResolvedValue({
      ok: false,
      error: { code: "EVENT_NOT_FOUND", message: "" },
    });
    const { composable } = await setup();
    expect(composable.data.value).toBeNull();
    composable.applyDeltas({ checkin: 1 });
    expect(composable.data.value).toBeNull();
  });
});
