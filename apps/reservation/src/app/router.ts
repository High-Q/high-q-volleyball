import {
  createRouter,
  createWebHistory,
  type RouteRecordRaw,
} from "vue-router";
import HomePlaceholder from "@/pages/HomePlaceholder.vue";
import LoginPlaceholder from "@/pages/LoginPlaceholder.vue";

/**
 * apps/reservation のルート定義。
 *
 * 関連:
 *   openspec/changes/admin-reservation-ui-foundation/specs/app-routing/spec.md
 *   openspec/changes/admin-reservation-ui-foundation/design.md (D6)
 *
 * MVP1 範囲ではプレースホルダ 2 ルートのみ。後続 Issue (#89-92, #148) で
 * 各機能を追加する。
 */
const routes: RouteRecordRaw[] = [
  { path: "/", name: "home", component: HomePlaceholder },
  { path: "/login", name: "login", component: LoginPlaceholder },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// TODO: auth guard をここに追加（reservation の会員認証）
// router.beforeEach 経由で未認証ユーザーを /login へリダイレクトする想定。
// 認証状態は Supabase session を読む。

export default router;
export { routes };
