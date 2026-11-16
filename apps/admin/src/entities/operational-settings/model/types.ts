import type { MemberId } from "@high-q/shared";

/**
 * operational_settings 1 行（camelCase 化済み）。サークル運営のグローバル設定。
 *
 * 関連:
 *   openspec/changes/member-registration-toggle/specs/admin-operational-settings/spec.md
 *   supabase/migrations/20261115000000_operational_settings.sql
 */
export interface OperationalSettings {
  /** 新規会員登録の受付可否。false = 受付停止中。 */
  memberRegistrationEnabled: boolean;
  /** ISO 8601 */
  updatedAt: string;
  updatedBy: MemberId | null;
}
