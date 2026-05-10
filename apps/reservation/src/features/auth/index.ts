export {
  installAuthSession,
  useAuthSession,
  type AuthSession,
} from "./composables/useAuthSession";
export { useSendMagicLink } from "./composables/useSendMagicLink";
export { useRequestSignupCode } from "./composables/useRequestSignupCode";
export type {
  SignupFormData,
  SignupFieldErrors,
  SignupErrorCode,
} from "./composables/useRequestSignupCode";
export { useVerifySignupCode } from "./composables/useVerifySignupCode";
export type { VerifyErrorCode } from "./composables/useVerifySignupCode";
export type { AuthStatus, AuthError } from "./types";
