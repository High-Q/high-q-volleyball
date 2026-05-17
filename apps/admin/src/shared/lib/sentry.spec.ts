import { describe, expect, it, vi } from "vitest";
import { createApp } from "vue";

vi.mock("@sentry/vue", () => ({
  init: vi.fn(),
  captureException: vi.fn(),
}));

import * as Sentry from "@sentry/vue";
import { captureException, initSentry } from "./sentry";

describe("admin Sentry wrapper", () => {
  it("test 環境では Sentry.init を呼ばない", () => {
    const app = createApp({ template: "<div/>" });
    initSentry(app);
    expect(Sentry.init).not.toHaveBeenCalled();
  });

  it("DSN 未設定なら captureException は console.error にフォールバック", () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    captureException(new Error("boom"), { status: 500 });
    expect(Sentry.captureException).not.toHaveBeenCalled();
    expect(errSpy).toHaveBeenCalledWith(
      "[sentry-disabled]",
      expect.any(Error),
      expect.objectContaining({ status: 500 })
    );
    errSpy.mockRestore();
  });
});
