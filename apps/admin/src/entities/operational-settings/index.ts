/**
 * entities/operational-settings の Public API（member-registration-toggle）。
 *
 * サークル運営のグローバル設定（現状は新規会員登録の受付可否）の型・取得・更新。
 * features/registration-toggle（運営設定トグル）から使う。
 *
 * 関連:
 *   openspec/changes/member-registration-toggle/specs/admin-operational-settings/spec.md
 */

export type { OperationalSettings } from "./model/types";
export {
  fetchOperationalSettings,
  updateMemberRegistrationEnabled,
  type FetchError as OperationalSettingsFetchError,
  type FetchErrorCode as OperationalSettingsFetchErrorCode,
} from "./api/operationalSettingsQueries";
