export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export type AuthError =
  | "invalid-email"
  | "unregistered"
  | "rate-limit"
  | "network"
  | "validation"
  | "unknown";
