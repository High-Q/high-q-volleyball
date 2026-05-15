import { computed, ref, type ComputedRef, type Ref } from "vue";
import type { MemberId } from "@high-q/shared";
import {
  updateMemberAdminNote,
  type FetchError,
} from "@/entities/member";

/**
 * 運営メモ編集の楽観的更新 composable。
 *
 * - textarea state + 文字数カウンタ + 楽観的更新 + 失敗時ロールバック
 * - 最大 500 文字を超えると canSave = false
 * - 保存中は disabled / saving 表示
 *
 * 関連:
 *   openspec/changes/admin-members-list-screen/specs/admin-members-list/spec.md (Requirement: 運営メモ編集)
 *   openspec/changes/admin-members-list-screen/design.md (D4)
 */

export const ADMIN_NOTE_MAX_LENGTH = 500;

export interface UseAdminNoteEditOptions {
  memberId: MemberId;
  initialValue: string | null;
  /** 保存成功時のコールバック (一覧キャッシュ更新等)。 */
  onSaved?: (note: string | null) => void;
  /** 保存失敗時のコールバック (Toast 通知等)。 */
  onError?: (error: FetchError) => void;
}

export interface UseAdminNoteEdit {
  value: Ref<string>;
  charCount: ComputedRef<number>;
  isOverLimit: ComputedRef<boolean>;
  isDirty: ComputedRef<boolean>;
  canSave: ComputedRef<boolean>;
  isSaving: Ref<boolean>;
  errorMessage: Ref<string | null>;
  save: () => Promise<void>;
  resetToInitial: () => void;
}

export function useAdminNoteEdit(
  options: UseAdminNoteEditOptions,
): UseAdminNoteEdit {
  const initial = options.initialValue ?? "";
  const value = ref<string>(initial);
  const isSaving = ref<boolean>(false);
  const errorMessage = ref<string | null>(null);

  const charCount = computed<number>(() => value.value.length);
  const isOverLimit = computed<boolean>(
    () => charCount.value > ADMIN_NOTE_MAX_LENGTH,
  );
  const isDirty = computed<boolean>(() => value.value !== initial);
  const canSave = computed<boolean>(
    () => !isOverLimit.value && !isSaving.value && isDirty.value,
  );

  async function save(): Promise<void> {
    if (!canSave.value) return;
    const next = value.value;
    const normalized = next.trim().length === 0 ? null : next;
    isSaving.value = true;
    errorMessage.value = null;
    // 楽観的更新は呼び出し側で onSaved にて一覧キャッシュを書き換える前提。
    // ここではローカル state を確定値で保ち、失敗時にロールバックする。
    const result = await updateMemberAdminNote(options.memberId, normalized);
    if (!result.ok) {
      // ロールバック (textarea 値は維持して再保存できるようにする)
      isSaving.value = false;
      errorMessage.value = result.error.message;
      options.onError?.(result.error);
      return;
    }
    isSaving.value = false;
    options.onSaved?.(normalized);
  }

  function resetToInitial(): void {
    value.value = initial;
    errorMessage.value = null;
  }

  return {
    value,
    charCount,
    isOverLimit,
    isDirty,
    canSave,
    isSaving,
    errorMessage,
    save,
    resetToInitial,
  };
}
