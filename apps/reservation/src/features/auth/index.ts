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
export { useRegistrationStatus } from "./composables/useRegistrationStatus";
export type { RegistrationAvailability } from "./composables/useRegistrationStatus";
export type { AuthStatus, AuthError } from "./types";
