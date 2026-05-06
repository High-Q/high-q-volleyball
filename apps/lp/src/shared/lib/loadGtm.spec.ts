// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GTM_ID, loadGtm, __resetGtmForTest } from "./loadGtm";

function gtmScripts(): HTMLScriptElement[] {
  return Array.from(
    document.head.querySelectorAll("script[data-hq-gtm='true']"),
  );
}

describe("loadGtm", () => {
  beforeEach(() => {
    __resetGtmForTest();
    document.head
      .querySelectorAll("script[data-hq-gtm='true']")
      .forEach((s) => s.remove());
    delete (window as unknown as { dataLayer?: unknown[] }).dataLayer;
  });

  afterEach(() => {
    __resetGtmForTest();
  });

  it("呼び出し前は document.head に gtm.js script が存在しない", () => {
    expect(gtmScripts()).toHaveLength(0);
  });

  it("loadGtm() で gtm.js を含む script tag が挿入される", () => {
    loadGtm();
    const scripts = gtmScripts();
    expect(scripts).toHaveLength(1);
    expect(scripts[0]!.src).toContain(
      `https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`,
    );
    expect(scripts[0]!.async).toBe(true);
  });

  it("loadGtm() を 2 回呼んでも script は 1 つしか挿入されない", () => {
    loadGtm();
    loadGtm();
    expect(gtmScripts()).toHaveLength(1);
  });

  it("loadGtm() で window.dataLayer が初期化され gtm.js イベントが push される", () => {
    loadGtm();
    const w = window as unknown as { dataLayer?: Array<Record<string, unknown>> };
    expect(Array.isArray(w.dataLayer)).toBe(true);
    expect(w.dataLayer![0]).toMatchObject({ event: "gtm.js" });
  });
});
