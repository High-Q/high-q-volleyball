import type { MemberId } from "./member.types";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function createMemberId(value: string): MemberId {
  if (!value || !UUID_PATTERN.test(value)) {
    throw new Error(`Invalid MemberId: ${value}`);
  }
  return value as MemberId;
}
