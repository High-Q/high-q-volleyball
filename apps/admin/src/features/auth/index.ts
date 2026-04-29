/**
 * features/auth — apps/admin の認証・認可レイヤー Public API。
 *
 * 関連:
 *   openspec/changes/admin-login-magic-link/specs/admin-auth/spec.md
 *
 * 本 index 経由でのみ外部レイヤーから参照する。内部の `composables/`
 * `api/` を直接 import することは禁止（FSD Public API 原則）。
 */

export {
  installAuthSession,
  useAuthSession,
  type AuthSession,
} from "./composables/useAuthSession";
export { useSendMagicLink } from "./composables/useSendMagicLink";
export { useMfaEnrollment } from "./composables/useMfaEnrollment";
export { useMfaChallenge } from "./composables/useMfaChallenge";
export { useIdleTimeout } from "./composables/useIdleTimeout";
export type {
  AuthStatus,
  AuthError,
  MfaStatus,
  MfaError,
  Aal,
} from "./types";
