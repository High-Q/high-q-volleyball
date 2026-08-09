import { describe, it, expect, vi } from "vitest";
import {
  pushLineMessage,
  LINE_PUSH_ENDPOINT,
  LINE_TEXT_MAX,
  type LineFetch,
  type LineFetchResponse,
} from "./line.js";

const CONFIG = { channelToken: "tok-123", toUserId: "Uabc" };

function res(status = 200, body = "{}"): LineFetchResponse {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: "",
    text: async () => body,
  };
}

describe("pushLineMessage", () => {
  it("push エンドポイントへ to / text / Bearer を載せて POST する", async () => {
    const fetchMock = vi.fn<LineFetch>(async () => res(200));
    const result = await pushLineMessage(CONFIG, "空きが出ました", fetchMock);

    expect(result).toEqual({ ok: true, status: 200 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe(LINE_PUSH_ENDPOINT);
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe("Bearer tok-123");
    const body = JSON.parse(init.body);
    expect(body.to).toBe("Uabc");
    expect(body.messages).toEqual([{ type: "text", text: "空きが出ました" }]);
  });

  it("空メッセージは送信せず ok:false を返す", async () => {
    const fetchMock = vi.fn<LineFetch>(async () => res(200));
    const result = await pushLineMessage(CONFIG, "   ", fetchMock);
    expect(result.ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("HTTP エラーは status と本文を error に載せて ok:false", async () => {
    const fetchMock = vi.fn<LineFetch>(async () => res(401, "bad token"));
    const result = await pushLineMessage(CONFIG, "x", fetchMock);
    expect(result).toEqual({ ok: false, status: 401, error: "bad token" });
  });

  it("ネットワーク例外は status:0 で握って ok:false", async () => {
    const fetchMock = vi.fn<LineFetch>(async () => {
      throw new Error("ECONNRESET");
    });
    const result = await pushLineMessage(CONFIG, "x", fetchMock);
    expect(result).toEqual({ ok: false, status: 0, error: "ECONNRESET" });
  });

  it("LINE_TEXT_MAX を超える本文は切り詰めてから送る", async () => {
    const fetchMock = vi.fn<LineFetch>(async () => res(200));
    const long = "あ".repeat(LINE_TEXT_MAX + 500);
    await pushLineMessage(CONFIG, long, fetchMock);
    const body = JSON.parse(fetchMock.mock.calls[0]![1].body);
    expect(body.messages[0].text.length).toBeLessThanOrEqual(LINE_TEXT_MAX);
  });
});
