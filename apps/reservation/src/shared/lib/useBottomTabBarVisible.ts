import { computed, type ComputedRef } from "vue";
import { useRoute } from "vue-router";
import { useAuthSession } from "@/features/auth";

/**
 * Bottom Tab Bar (ホーム / 履歴 / プロフィール) を表示するかの判定。
 *
 * 表示条件:
 *   - 認証済 + プロフィール完成 + 書類提出済 (auth guard を通過した正規会員)
 *   - かつ認証フロー (/login, /signup/*, /auth/*) 以外のメイン画面
 *
 * App.vue の root padding-bottom と BottomTabBar の v-if で同じ判定を使うため、
 * 共通 composable として shared/lib に置く。
 */
export function useBottomTabBarVisible(): ComputedRef<boolean> {
  const route = useRoute();
  const session = useAuthSession();

  return computed(() => {
    if (session.status.value !== "authenticated") return false;
    if (session.isProfileComplete.value !== true) return false;
    if (session.hasIdentityDocument.value !== true) return false;
    const name = String(route.name ?? "");
    if (
      name === "login" ||
      name === "signup" ||
      name === "signup-verify" ||
      name === "signup-identity" ||
      name === "auth-callback" ||
      name === "auth-link-sent"
    ) {
      return false;
    }
    return true;
  });
}

/** タブバーの占有高さ (アイコン + ラベル + 上下 padding + iOS safe area) */
export const BOTTOM_TAB_BAR_HEIGHT_PX = 80;
