import { ref, type Ref } from "vue";
import { useAuthSession } from "@/features/auth";
import type { ExperienceLevel, MemberId } from "@/entities/member";
import { updateMyExperienceLevel } from "../api/updateMyExperienceLevel";

export type UseLevelEditReturn = {
  saving: Ref<boolean>;
  error: Ref<string | null>;
  save: (memberId: MemberId, level: ExperienceLevel) => Promise<boolean>;
  reset: () => void;
};

/**
 * 経験レベル即時保存 composable。失敗時は呼び出し側でローカル state を元に戻す。
 */
export function useLevelEdit(): UseLevelEditReturn {
  const saving = ref<boolean>(false);
  const error = ref<string | null>(null);
  const session = useAuthSession();

  async function save(
    memberId: MemberId,
    level: ExperienceLevel,
  ): Promise<boolean> {
    if (saving.value) return false;
    saving.value = true;
    error.value = null;
    try {
      await updateMyExperienceLevel(memberId, level);
      await session.refresh();
      return true;
    } catch (cause) {
      error.value =
        cause instanceof Error
          ? cause.message
          : "変更を保存できませんでした。再試行してください。";
      return false;
    } finally {
      saving.value = false;
    }
  }

  function reset(): void {
    error.value = null;
  }

  return { saving, error, save, reset };
}
