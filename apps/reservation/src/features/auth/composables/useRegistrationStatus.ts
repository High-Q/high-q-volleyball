import { ref } from "vue";
import { getSupabase } from "@/shared/api/supabase";

/**
 * 新規会員登録の受付可否を取得する composable（member-registration-toggle）。
 *
 * 公開関数 `public.registration_open()` を RPC で参照する。
 *
 * フェイルオープン: 読取がエラー / 例外のときはフォームを出す（state='open'）。
 * 誤って正規の希望者を門前払いしないため。真の可否は送信時に Edge Function が
 * 権威判定する（停止中なら 503 registration-suspended を返す）。design.md D4。
 *
 * spec: openspec/changes/member-registration-toggle/specs/reservation-member-auth/spec.md
 *   「/signup 受付停止中の表示」
 */

export type RegistrationAvailability = "checking" | "open" | "suspended";

export function useRegistrationStatus() {
  const state = ref<RegistrationAvailability>("checking");

  async function check(): Promise<void> {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.rpc("registration_open");
      if (error) {
        state.value = "open"; // フェイルオープン
        return;
      }
      state.value = data === false ? "suspended" : "open";
    } catch {
      state.value = "open"; // フェイルオープン
    }
  }

  return { state, check };
}
