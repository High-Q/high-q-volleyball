import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * fetchMemberAnnouncements の取得テスト（general-announcements / #395）。
 * モック方針は entities/event/api/event-client.spec.ts を手本にする。
 */

type Chain = {
  select: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
};

let plan: { data: unknown[] | null; error: unknown } = { data: [], error: null };
const selectMock = vi.fn();
const inMock = vi.fn();
const orderMock = vi.fn();

function makeChain(): Chain {
  const chain: Chain = {
    select: selectMock.mockReturnThis() as Chain["select"],
    in: inMock.mockReturnThis() as Chain["in"],
    order: orderMock.mockImplementation(() => Promise.resolve(plan)) as Chain["order"],
  };
  return chain;
}

const fromMock = vi.fn(() => makeChain());

vi.mock("@/shared/api/supabase", () => ({
  getSupabase: () => ({ from: fromMock }),
}));

beforeEach(() => {
  plan = { data: [], error: null };
  vi.clearAllMocks();
});
afterEach(() => {
  vi.restoreAllMocks();
});

const ROW = {
  id: "33333333-3333-4333-8333-333333333333",
  title: "持ち物変更のお知らせ",
  body: "本文\n改行あり",
  publish_start: "2026-11-18T00:00:00+09:00",
};

describe("fetchMemberAnnouncements", () => {
  it("audience in (members, all) を掲載開始の降順で取得し camelCase に変換する", async () => {
    plan = { data: [ROW], error: null };
    const { fetchMemberAnnouncements } = await import("./announcement-client");
    const result = await fetchMemberAnnouncements();
    expect(fromMock).toHaveBeenCalledWith("announcements");
    expect(inMock).toHaveBeenCalledWith("audience", ["members", "all"]);
    expect(orderMock).toHaveBeenCalledWith("publish_start", { ascending: false });
    expect(result).toEqual([
      {
        id: "33333333-3333-4333-8333-333333333333",
        title: "持ち物変更のお知らせ",
        body: "本文\n改行あり",
        publishStart: "2026-11-18T00:00:00+09:00",
      },
    ]);
  });

  it("data が null なら空配列", async () => {
    plan = { data: null, error: null };
    const { fetchMemberAnnouncements } = await import("./announcement-client");
    expect(await fetchMemberAnnouncements()).toEqual([]);
  });

  it("error なら throw する", async () => {
    plan = { data: null, error: { message: "db down" } };
    const { fetchMemberAnnouncements } = await import("./announcement-client");
    await expect(fetchMemberAnnouncements()).rejects.toBeDefined();
  });
});
