import { describe, it, expect } from "vitest";
import { reportCrawlFailure, type CrawlFailure, type FailureReporter } from "./failure.js";

function fakeReporter(): FailureReporter & { calls: CrawlFailure[] } {
  const calls: CrawlFailure[] = [];
  return { calls, capture: (f) => calls.push(f) };
}

describe("reportCrawlFailure", () => {
  it("種別・メッセージを reporter に渡す", () => {
    const r = fakeReporter();
    reportCrawlFailure(r, "http_error", "500 Internal Server Error");
    expect(r.calls).toEqual([
      { kind: "http_error", message: "500 Internal Server Error" },
    ]);
  });

  it("context があれば含める", () => {
    const r = fakeReporter();
    reportCrawlFailure(r, "parse_empty", "0 slots parsed", { url: "https://x" });
    expect(r.calls[0]?.context).toEqual({ url: "https://x" });
  });

  it("context 未指定なら context キーを含めない", () => {
    const r = fakeReporter();
    reportCrawlFailure(r, "unreachable", "timeout");
    expect(r.calls[0]).not.toHaveProperty("context");
  });
});
