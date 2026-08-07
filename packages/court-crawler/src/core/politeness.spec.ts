import { describe, it, expect } from "vitest";
import {
  MIN_REQUEST_INTERVAL_MS,
  POLL_INTERVAL_MS,
  effectiveRequestIntervalMs,
  nextRequestDelayMs,
} from "./politeness.js";

describe("effectiveRequestIntervalMs", () => {
  it("Crawl-delay 未指定は floor を返す", () => {
    expect(effectiveRequestIntervalMs()).toBe(MIN_REQUEST_INTERVAL_MS);
    expect(effectiveRequestIntervalMs(null)).toBe(MIN_REQUEST_INTERVAL_MS);
    expect(effectiveRequestIntervalMs(0)).toBe(MIN_REQUEST_INTERVAL_MS);
  });

  it("Crawl-delay(秒) を ms に換算し floor と大きい方を採る", () => {
    expect(effectiveRequestIntervalMs(5)).toBe(5000);
    expect(effectiveRequestIntervalMs(0.5)).toBe(MIN_REQUEST_INTERVAL_MS); // 500ms < floor
  });
});

describe("nextRequestDelayMs", () => {
  it("初回は待たない", () => {
    expect(nextRequestDelayMs(null, 1000)).toBe(0);
  });

  it("間隔未達なら残り時間を返す", () => {
    expect(nextRequestDelayMs(1000, 1300, 1000)).toBe(700);
  });

  it("間隔を満たしていれば 0", () => {
    expect(nextRequestDelayMs(1000, 3000, 1000)).toBe(0);
  });
});

describe("POLL_INTERVAL_MS", () => {
  it("既定は 20 分", () => {
    expect(POLL_INTERVAL_MS).toBe(20 * 60 * 1000);
  });
});
