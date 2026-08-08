import type { AvailabilitySlot } from "../core/types.js";

/**
 * 通知済み空き枠の永続ストア（重複排除の状態）。
 * 実装は Supabase（service_role）だが、結線・テストのため抽象に依存する。
 */
export interface NotifiedStore {
  /** 施設の通知済み枠を全件返す（reconcile の集合 B）。 */
  fetchNotified(facility: string): Promise<AvailabilitySlot[]>;
  /** 新規通知した枠を記録に追加する（重複は無視）。 */
  addNotified(slots: readonly AvailabilitySlot[]): Promise<void>;
  /** 埋まって空きが消えた枠を記録から削除する（再オープン再通知のため）。 */
  removeReleased(slots: readonly AvailabilitySlot[]): Promise<void>;
}
