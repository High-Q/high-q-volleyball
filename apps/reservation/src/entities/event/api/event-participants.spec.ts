import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { unsafeEventId } from "@high-q/shared";

const supabaseMock = {
  rpc: vi.fn(),
};

vi.mock("@/shared/api/supabase", () => ({
  getSupabase: () => supabaseMock,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

const EVENT_ID = unsafeEventId("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");

describe("fetchEventParticipantNicknames", () => {
  it("RPC `get_event_participant_nicknames` を p_event_id 付きで呼び出す", async () => {
    supabaseMock.rpc.mockResolvedValueOnce({ data: [], error: null });

    const { fetchEventParticipantNicknames } = await import("./event-participants");
    await fetchEventParticipantNicknames(EVENT_ID);

    expect(supabaseMock.rpc).toHaveBeenCalledWith("get_event_participant_nicknames", {
      p_event_id: EVENT_ID,
    });
  });

  it("RPC 戻り値を camelCase + Branded Type の配列に変換する", async () => {
    supabaseMock.rpc.mockResolvedValueOnce({
      data: [
        {
          member_id: "00000000-0000-0000-0000-000000000001",
          nickname: "ミサキ",
          is_self: true,
          guest_count: 1,
        },
        {
          member_id: "00000000-0000-0000-0000-000000000002",
          nickname: null,
          is_self: false,
          guest_count: 0,
        },
      ],
      error: null,
    });

    const { fetchEventParticipantNicknames } = await import("./event-participants");
    const rows = await fetchEventParticipantNicknames(EVENT_ID);

    expect(rows).toEqual([
      {
        memberId: "00000000-0000-0000-0000-000000000001",
        nickname: "ミサキ",
        isSelf: true,
        guestCount: 1,
      },
      {
        memberId: "00000000-0000-0000-0000-000000000002",
        nickname: null,
        isSelf: false,
        guestCount: 0,
      },
    ]);
  });

  it("RLS / 自分が予約していないイベントで空配列が返ったときは空配列を返す", async () => {
    supabaseMock.rpc.mockResolvedValueOnce({ data: [], error: null });

    const { fetchEventParticipantNicknames } = await import("./event-participants");
    const rows = await fetchEventParticipantNicknames(EVENT_ID);

    expect(rows).toEqual([]);
  });

  it("RPC が null data を返したときは空配列にフォールバックする", async () => {
    supabaseMock.rpc.mockResolvedValueOnce({ data: null, error: null });

    const { fetchEventParticipantNicknames } = await import("./event-participants");
    const rows = await fetchEventParticipantNicknames(EVENT_ID);

    expect(rows).toEqual([]);
  });

  it("RPC が error を返したときは throw する (画面側で Error 状態に倒すため)", async () => {
    supabaseMock.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: "network error" },
    });

    const { fetchEventParticipantNicknames } = await import("./event-participants");
    await expect(fetchEventParticipantNicknames(EVENT_ID)).rejects.toMatchObject({
      message: "network error",
    });
  });
});
