import { describe, it, expect } from "vitest";
import { createExperienceLevel } from "./experienceLevel";

describe("createExperienceLevel", () => {
  it("enum 外でエラー", () => {
    expect(() => createExperienceLevel("unknown")).toThrow(/経験レベル/);
    expect(() => createExperienceLevel("")).toThrow(/経験レベル/);
    expect(() => createExperienceLevel("Beginner")).toThrow(/経験レベル/);
  });

  it("beginner / intermediate / experienced で正常", () => {
    expect(createExperienceLevel("beginner")).toBe("beginner");
    expect(createExperienceLevel("intermediate")).toBe("intermediate");
    expect(createExperienceLevel("experienced")).toBe("experienced");
  });
});
