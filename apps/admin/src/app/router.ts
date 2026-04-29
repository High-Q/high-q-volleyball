import {
  createRouter,
  createWebHistory,
  type RouteRecordRaw,
} from "vue-router";
import HomePlaceholder from "@/pages/HomePlaceholder.vue";
import LoginPlaceholder from "@/pages/LoginPlaceholder.vue";

/**
 * apps/admin のルート定義。
 *
 * 関連:
 *   openspec/changes/admin-reservation-ui-foundation/specs/app-routing/spec.md
 *   openspec/changes/admin-reservation-ui-foundation/design.md (D6)
 *
 * MVP1 範囲ではプレースホルダ 2 ルートのみ。後続 Issue で各機能を追加する。
 */
const routes: RouteRecordRaw[] = [
  { path: "/", name: "home", component: HomePlaceholder },
  { path: "/login", name: "login", component: LoginPlaceholder },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// TODO(#84): auth guard をここに追加
// router.beforeEach 経由で未認証ユーザーを /login へリダイレクトする。
// 認証状態は Supabase session を読み、admin 判定は public.is_admin() RPC
// または members.role = 'admin' の参照で行う想定。

export default router;
export { routes };
