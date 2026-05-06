import { describe, expect, it } from "vitest";
import { createMemberId } from "@/entities/member";
import { updateMyExperienceLevel } from "./updateMyExperienceLevel";

describe("updateMyExperienceLevel", () => {
  it("enum 外の値は createExperienceLevel が例外を投げる (UPDATE 発行前)", async () => {
    const memberId = createMemberId("00000000-0000-0000-0000-00000000ffff");
    await expect(updateMyExperienceLevel(memberId, "unknown")).rejects.toThrow(
      /経験レベルが正しくありません/,
    );
  });
});
