/**
 * features/auth — 型定義。
 *
 * 関連:
 *   openspec/changes/admin-login-magic-link/specs/admin-auth/spec.md
 *   openspec/changes/admin-login-magic-link/design.md (D11, D12)
 */

/** セッション状態の lifecycle。 */
export type AuthStatus =
  | "idle"
  | "loading"
  | "authenticated"
  | "unauthenticated";

/** マジックリンク送信時のエラーコード。 */
export type AuthError =
  | "invalid-email"
  | "rate-limit"
  | "network"
  | "unknown";

/** MFA enroll / challenge の状態 lifecycle。 */
export type MfaStatus =
  | "idle"
  | "enrolling"
  | "awaiting-code"
  | "verifying"
  | "success"
  | "error";

/** MFA verify 時のエラーコード。 */
export type MfaError =
  | "invalid-code"
  | "rate-limit"
  | "network"
  | "no-factor"
  | "unknown";

/** Supabase Auth の Authentication Assurance Level。 */
export type Aal = "aal1" | "aal2";
