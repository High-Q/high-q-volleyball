// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CONSENT_STORAGE_KEY } from "./types.js";
import {
  getConsent,
  setConsent,
  onConsentChange,
  __resetConsentForTest,
} from "./storage.js";

describe("consent storage", () => {
  beforeEach(() => {
    localStorage.clear();
    __resetConsentForTest();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("getConsent returns null when no decision is stored", () => {
    expect(getConsent()).toBeNull();
  });

  it("setConsent persists to localStorage with decidedAt", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-06T09:00:00.000Z"));

    setConsent({ necessary: true, analytics: true });

    const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed).toEqual({
      necessary: true,
      analytics: true,
      decidedAt: "2026-05-06T09:00:00.000Z",
    });
  });

  it("getConsent round-trips a stored decision", () => {
    setConsent({ necessary: true, analytics: false });

    const decision = getConsent();
    expect(decision).not.toBeNull();
    expect(decision!.necessary).toBe(true);
    expect(decision!.analytics).toBe(false);
    expect(typeof decision!.decidedAt).toBe("string");
  });

  it("getConsent returns null when stored value is malformed JSON", () => {
    localStorage.setItem(CONSENT_STORAGE_KEY, "{not json");
    expect(getConsent()).toBeNull();
  });

  it("getConsent returns null when stored value has invalid shape", () => {
    localStorage.setItem(
      CONSENT_STORAGE_KEY,
      JSON.stringify({ necessary: false, analytics: "yes" }),
    );
    expect(getConsent()).toBeNull();
  });

  it("onConsentChange fires handler when setConsent is called", () => {
    const handler = vi.fn();
    onConsentChange(handler);

    setConsent({ necessary: true, analytics: true });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0]![0]).toMatchObject({
      necessary: true,
      analytics: true,
    });
  });

  it("onConsentChange unsubscribe stops further notifications", () => {
    const handler = vi.fn();
    const unsubscribe = onConsentChange(handler);

    setConsent({ necessary: true, analytics: true });
    unsubscribe();
    setConsent({ necessary: true, analytics: false });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("onConsentChange supports multiple subscribers", () => {
    const a = vi.fn();
    const b = vi.fn();
    onConsentChange(a);
    onConsentChange(b);

    setConsent({ necessary: true, analytics: true });

    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });

  it("falls back to in-memory store when localStorage throws on write", () => {
    const setItemSpy = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("QuotaExceededError");
      });

    setConsent({ necessary: true, analytics: false });

    const decision = getConsent();
    expect(decision).not.toBeNull();
    expect(decision!.analytics).toBe(false);

    setItemSpy.mockRestore();
  });
});
