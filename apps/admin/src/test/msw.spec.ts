import { describe, expect, it } from "vitest";

describe("MSW sample", () => {
  it("returns mocked response from /api/sample", async () => {
    const response = await fetch("http://localhost/api/sample");
    expect(response.ok).toBe(true);
    const body = (await response.json()) as { ok: boolean };
    expect(body.ok).toBe(true);
  });
});
