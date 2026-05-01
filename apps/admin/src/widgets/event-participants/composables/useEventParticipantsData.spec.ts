import { mount, flushPromises, type VueWrapper } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, ref, type Ref } from "vue";
import { createMemoryHistory, createRouter, type Router } from "vue-router";
import type { EventId } from "@high-q/shared";

const { getEventParticipantsMock } = vi.hoisted(() => ({
  getEventParticipantsMock: vi.fn(),
}));

vi.mock("@/entities/reservation", async () => {
  const actual = await vi.importActual<
    typeof import("@/entities/reservation")
  >("@/entities/reservation");
  return {
    ...actual,
    getEventParticipants: getEventParticipantsMock,
  };
});

import { useEventParticipantsData } from "./useEventParticipantsData";

const EVENT_ID = "00000000-0000-0000-0000-000000000001" as unknown as EventId;

function makeRow(overrides: Partial<{
  reservation_id: string;
  display_name: string;
  email: string;
  experience_level: "beginner" | "intermediate" | "experienced";
  checked_in_at: string | null;
  is_first_time: boolean;
}>) {
  return {
    reservation_id: "r1",
    event_id: EVENT_ID,
    member_id: "m1",
    display_name: "田中 美咲",
    email: "tanaka@example.com",
    experience_level: "beginner" as const,
    guest_count: 0,
    status: "reserved" as const,
    checked_in_at: null,
    created_at: "2026-04-27T05:32:00Z",
    is_first_time: true,
    ...overrides,
  };
}

let wrapper: VueWrapper | null = null;

async function setup(
  rows: ReturnType<typeof makeRow>[],
  initialQuery = "",
): Promise<{
  router: Router;
  composable: ReturnType<typeof useEventParticipantsData>;
}> {
  getEventParticipantsMock.mockResolvedValue({ ok: true, value: rows });
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: "/events/:id",
        name: "events-detail",
        component: { template: "<div />" },
      },
    ],
  });
  await router.push(
    `/events/test${initialQuery ? `?${initialQuery}` : ""}`,
  );
  await router.isReady();

  let captured!: ReturnType<typeof useEventParticipantsData>;
  const idRef: Ref<EventId | null> = ref(EVENT_ID);
  const Harness = defineComponent({
    setup() {
      captured = useEventParticipantsData(idRef);
      return () => h("div");
    },
  });
  wrapper = mount(Harness, { global: { plugins: [router] } });
  await flushPromises();
  return { router, composable: captured };
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
});

describe("useEventParticipantsData — 取得", () => {
  it("eventId で getEventParticipants を呼ぶ", async () => {
    await setup([]);
    expect(getEventParticipantsMock).toHaveBeenCalledWith(EVENT_ID);
  });

  it("成功時に rawData がセットされる", async () => {
    const { composable } = await setup([
      makeRow({ reservation_id: "r1" }),
      makeRow({ reservation_id: "r2", display_name: "佐藤" }),
    ]);
    expect(composable.rawData.value).toHaveLength(2);
  });

  it("isEmpty: 0 件で true", async () => {
    const { composable } = await setup([]);
    expect(composable.isEmpty.value).toBe(true);
  });

  it("isEmpty: 行ありで false", async () => {
    const { composable } = await setup([makeRow({})]);
    expect(composable.isEmpty.value).toBe(false);
  });
});

describe("useEventParticipantsData — filter 適用", () => {
  const rows = [
    makeRow({
      reservation_id: "r1",
      display_name: "田中 美咲",
      email: "tanaka@example.com",
      experience_level: "beginner",
      checked_in_at: null,
    }),
    makeRow({
      reservation_id: "r2",
      display_name: "佐藤 健太",
      email: "sato@example.com",
      experience_level: "experienced",
      checked_in_at: "2026-04-28T10:00:00Z",
    }),
    makeRow({
      reservation_id: "r3",
      display_name: "中村 あかり",
      email: "nakamura@example.com",
      experience_level: "intermediate",
      checked_in_at: "2026-04-28T10:05:00Z",
    }),
  ];

  it("filter 未指定で全件返る", async () => {
    const { composable } = await setup(rows);
    expect(composable.data.value).toHaveLength(3);
  });

  it("?q=tanaka で display_name / email 部分一致絞り込み", async () => {
    const { composable } = await setup(rows, "q=tanaka");
    expect(composable.data.value).toHaveLength(1);
    expect(composable.data.value[0]!.display_name).toBe("田中 美咲");
  });

  it("?q=美咲 で display_name 日本語部分一致", async () => {
    const { composable } = await setup(rows, "q=美咲");
    expect(composable.data.value).toHaveLength(1);
  });

  it("?exp=experienced で経験フィルタ", async () => {
    const { composable } = await setup(rows, "exp=experienced");
    expect(composable.data.value).toHaveLength(1);
    expect(composable.data.value[0]!.display_name).toBe("佐藤 健太");
  });

  it("?ck=checked でチェックイン済のみ", async () => {
    const { composable } = await setup(rows, "ck=checked");
    expect(composable.data.value).toHaveLength(2);
  });

  it("?ck=unchecked で未チェックインのみ", async () => {
    const { composable } = await setup(rows, "ck=unchecked");
    expect(composable.data.value).toHaveLength(1);
    expect(composable.data.value[0]!.display_name).toBe("田中 美咲");
  });

  it("複合: ?q=佐&exp=experienced で「佐」を含む experienced のみ", async () => {
    const { composable } = await setup(rows, "q=%E4%BD%90&exp=experienced");
    expect(composable.data.value).toHaveLength(1);
    expect(composable.data.value[0]!.display_name).toBe("佐藤 健太");
  });

  it("rawData は filter で変化しない（StatCard 集計用）", async () => {
    const { composable } = await setup(rows, "ck=checked");
    expect(composable.rawData.value).toHaveLength(3);
    expect(composable.checkedInCount.value).toBe(2);
  });
});

describe("useEventParticipantsData — Optimistic 操作", () => {
  it("applyCheckinFlip で行の checked_in_at を反転", async () => {
    const { composable } = await setup([
      makeRow({ reservation_id: "r1", checked_in_at: null }),
    ]);
    composable.applyCheckinFlip("r1", true);
    expect(composable.rawData.value[0]!.checked_in_at).not.toBeNull();
    expect(composable.rawData.value[0]!.status).toBe("attended");

    composable.applyCheckinFlip("r1", false);
    expect(composable.rawData.value[0]!.checked_in_at).toBeNull();
    expect(composable.rawData.value[0]!.status).toBe("reserved");
  });

  it("removeRow で行が rawData から消える", async () => {
    const { composable } = await setup([
      makeRow({ reservation_id: "r1" }),
      makeRow({ reservation_id: "r2", display_name: "佐藤" }),
    ]);
    composable.removeRow("r1");
    expect(composable.rawData.value).toHaveLength(1);
    expect(composable.rawData.value[0]!.display_name).toBe("佐藤");
  });
});

describe("useEventParticipantsData — エラー", () => {
  it("PERMISSION_DENIED で isError=true + errorCode", async () => {
    getEventParticipantsMock.mockResolvedValue({
      ok: false,
      error: { code: "PERMISSION_DENIED", message: "" },
    });
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/events/:id", name: "x", component: { template: "<div />" } },
      ],
    });
    await router.push("/events/test");
    let captured!: ReturnType<typeof useEventParticipantsData>;
    const Harness = defineComponent({
      setup() {
        captured = useEventParticipantsData(ref(EVENT_ID));
        return () => h("div");
      },
    });
    wrapper = mount(Harness, { global: { plugins: [router] } });
    await flushPromises();
    expect(captured.isError.value).toBe(true);
    expect(captured.errorCode.value).toBe("PERMISSION_DENIED");
  });
});
