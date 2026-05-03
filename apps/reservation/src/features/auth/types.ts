export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export type AuthError =
  | "invalid-email"
  | "rate-limit"
  | "network"
  | "validation"
  | "unknown";
