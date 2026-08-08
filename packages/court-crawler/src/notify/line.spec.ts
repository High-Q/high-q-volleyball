import { describe, it, expect, vi } from "vitest";
import { pushLineMessage, LINE_PUSH_ENDPOINT, LINE_TEXT_MAX } from "./line.js";

const CONFIG = { channelToken: "tok-123", toUserId: "Uabc" };

function okResponse(status = 200): Response {
  return new Response("{}", { status });
}

describe("pushLineMessage", () => {
  it("push エンドポイントへ to / text / Bearer を載せて POST する", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => okResponse());
    const res = await pushLineMessage(CONFIG, "空きが出ました", fetchMock);

    expect(res).toEqual({ ok: true, status: 200 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe(LINE_PUSH_ENDPOINT);
    expect(init?.method).toBe("POST");
    const headers = init?.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer tok-123");
    const body = JSON.parse(init?.body as string);
    expect(body.to).toBe("Uabc");
    expect(body.messages).toEqual([{ type: "text", text: "空きが出ました" }]);
  });

  it("空メッセージは送信せず ok:false を返す", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => okResponse());
    const res = await pushLineMessage(CONFIG, "   ", fetchMock);
    expect(res.ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("HTTP エラーは status と本文を error に載せて ok:false", async () => {
    const fetchMock = vi.fn<typeof fetch>(
      async () => new Response("bad token", { status: 401 }),
    );
    const res = await pushLineMessage(CONFIG, "x", fetchMock);
    expect(res).toEqual({ ok: false, status: 401, error: "bad token" });
  });

  it("ネットワーク例外は status:0 で握って ok:false", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => {
      throw new Error("ECONNRESET");
    });
    const res = await pushLineMessage(CONFIG, "x", fetchMock);
    expect(res).toEqual({ ok: false, status: 0, error: "ECONNRESET" });
  });

  it("LINE_TEXT_MAX を超える本文は切り詰めてから送る", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => okResponse());
    const long = "あ".repeat(LINE_TEXT_MAX + 500);
    await pushLineMessage(CONFIG, long, fetchMock);
    const body = JSON.parse(fetchMock.mock.calls[0]![1]?.body as string);
    expect(body.messages[0].text.length).toBeLessThanOrEqual(LINE_TEXT_MAX);
  });
});
