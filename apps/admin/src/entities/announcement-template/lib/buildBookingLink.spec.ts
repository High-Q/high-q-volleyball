import { afterEach, describe, expect, it, vi } from "vitest";
import { unsafeEventId } from "@high-q/shared";
import { buildBookingLink } from "./buildBookingLink";

describe("buildBookingLink", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("予約シート自動オープン + 外部ブラウザ指定付きのイベント詳細リンクを返す", () => {
    expect(
      buildBookingLink(unsafeEventId("abc"), { baseUrl: "https://high-q-reservation.onrender.com" }),
    ).toBe(
      "https://high-q-reservation.onrender.com/events/abc?book=1&openExternalBrowser=1",
    );
  });

  it("openExternalBrowser: false（X 用）では book=1 のみ", () => {
    expect(
      buildBookingLink(unsafeEventId("abc"), {
        baseUrl: "https://high-q-reservation.onrender.com",
        openExternalBrowser: false,
      }),
    ).toBe("https://high-q-reservation.onrender.com/events/abc?book=1");
  });

  it("ベース URL 末尾スラッシュの有無で結果が変わらない", () => {
    expect(buildBookingLink(unsafeEventId("abc"), { baseUrl: "https://example.com/" })).toBe(
      buildBookingLink(unsafeEventId("abc"), { baseUrl: "https://example.com" }),
    );
  });

  it("イベント ID を URL エンコードする", () => {
    expect(buildBookingLink(unsafeEventId("a/b c"), { baseUrl: "https://example.com" })).toBe(
      "https://example.com/events/a%2Fb%20c?book=1&openExternalBrowser=1",
    );
  });

  it("ベース URL 省略時は環境変数未設定なら本番の予約サイト", () => {
    // ローカル確認用に .env.local で設定されていても影響を受けないよう空に固定
    vi.stubEnv("VITE_RESERVATION_URL", "");
    expect(buildBookingLink(unsafeEventId("abc"))).toBe(
      "https://high-q-reservation.onrender.com/events/abc?book=1&openExternalBrowser=1",
    );
  });
});

describe("buildBookingLink (環境変数あり)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("VITE_RESERVATION_URL が設定されていればそれを使う", () => {
    vi.stubEnv("VITE_RESERVATION_URL", "http://localhost:5174/");
    expect(buildBookingLink(unsafeEventId("abc"))).toBe(
      "http://localhost:5174/events/abc?book=1&openExternalBrowser=1",
    );
  });
});
