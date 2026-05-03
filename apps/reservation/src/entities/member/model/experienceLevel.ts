import type { ExperienceLevel } from "./member.types";

const VALID: ReadonlyArray<ExperienceLevel> = [
  "beginner",
  "intermediate",
  "experienced",
];

export function createExperienceLevel(value: string): ExperienceLevel {
  if (!VALID.includes(value as ExperienceLevel)) {
    throw new Error(`経験レベルが正しくありません: ${value}`);
  }
  return value as ExperienceLevel;
}
