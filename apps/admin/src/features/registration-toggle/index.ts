/**
 * features/registration-toggle の Public API（member-registration-toggle）。
 *
 * 運営設定ページの「新規会員登録の受付可否」トグル。
 *
 * 関連:
 *   openspec/changes/member-registration-toggle/specs/admin-operational-settings/spec.md
 */

export { default as RegistrationToggleCard } from "./ui/RegistrationToggleCard.vue";
export {
  useRegistrationToggle,
  type UseRegistrationToggle,
  type RegistrationToggleStatus,
} from "./composables/useRegistrationToggle";
