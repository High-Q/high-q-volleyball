import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * useRegistrationStatus のテスト。registration_open RPC をモックする。
 */

const rpcMock = vi.fn();

vi.mock("@/shared/api/supabase", () => ({
  getSupabase: () => ({ rpc: rpcMock }),
  _resetSupabaseForTest: () => {},
}));

beforeEach(() => {
  vi.clearAllMocks();
});

async function makeStatus() {
  const { useRegistrationStatus } = await import("./useRegistrationStatus");
  return useRegistrationStatus();
}

describe("useRegistrationStatus", () => {
  it("初期状態は checking", async () => {
    const s = await makeStatus();
    expect(s.state.value).toBe("checking");
  });

  it("RPC が true なら open", async () => {
    rpcMock.mockResolvedValue({ data: true, error: null });
    const s = await makeStatus();
    await s.check();
    expect(s.state.value).toBe("open");
  });

  it("RPC が false なら suspended", async () => {
    rpcMock.mockResolvedValue({ data: false, error: null });
    const s = await makeStatus();
    await s.check();
    expect(s.state.value).toBe("suspended");
  });

  it("RPC error はフェイルオープン（open）", async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: "boom" } });
    const s = await makeStatus();
    await s.check();
    expect(s.state.value).toBe("open");
  });

  it("RPC が throw してもフェイルオープン（open）", async () => {
    rpcMock.mockRejectedValue(new Error("network"));
    const s = await makeStatus();
    await s.check();
    expect(s.state.value).toBe("open");
  });
});
