import {
  createRouter,
  createWebHistory,
  type RouteLocationNormalized,
  type RouteLocationRaw,
  type RouteRecordRaw,
  type Router,
} from "vue-router";
import DashboardPage from "@/pages/DashboardPage.vue";
import EventsListPage from "@/pages/EventsListPage.vue";
import EventCreatePage from "@/pages/EventCreatePage.vue";
import EventEditPage from "@/pages/EventEditPage.vue";
import EventDetailPage from "@/pages/EventDetailPage.vue";
import MembersListPage from "@/pages/MembersListPage.vue";
import VenuesPage from "@/pages/VenuesPage.vue";
// IdentityDocuments 系は重い widget チェーン (Dialog プリミティブ + 詳細 widget の
// 多数 sub-component) を持つため lazy import で起動コストを下げる。これにより
// router.spec.ts の guard timeout (CI 弱 runner で 5s 超え) も回避する。
import LoginPage from "@/pages/LoginPage.vue";
import AuthCallbackPage from "@/pages/AuthCallbackPage.vue";
import MfaChallengePage from "@/pages/MfaChallengePage.vue";
import MfaSetupPage from "@/pages/MfaSetupPage.vue";
import { useAuthSession } from "@/features/auth";

/**
 * apps/admin のルート定義 + auth guard。
 *
 * 関連:
 *   openspec/changes/admin-login-magic-link/specs/app-routing/spec.md
 *   openspec/changes/admin-login-magic-link/design.md (D4, D8)
 *   openspec/changes/admin-events-list-screen/specs/app-routing/spec.md
 */
const routes: RouteRecordRaw[] = [
  // #149 admin の `/` は dashboard 画面 (従来の /events redirect を廃止)
  // #155 meta.title はモバイル AppBar の画面タイトルに使用される (admin-shell)
  {
    path: "/",
    name: "dashboard",
    component: DashboardPage,
    meta: { title: "ダッシュボード" },
  },
  {
    path: "/events",
    name: "events",
    component: EventsListPage,
    meta: { title: "イベント" },
  },
  {
    path: "/events/new",
    name: "events-new",
    component: EventCreatePage,
    meta: { title: "イベント作成" },
  },
  {
    path: "/events/:id/edit",
    name: "events-edit",
    component: EventEditPage,
    meta: { title: "イベント編集" },
  },
  {
    path: "/events/:id",
    name: "events-detail",
    component: EventDetailPage,
    meta: { title: "イベント詳細" },
  },
  // #150 admin members list screen
  {
    path: "/members",
    name: "members",
    component: MembersListPage,
    meta: { title: "会員" },
  },
  // #151 admin venues master-detail screen（単一画面で一覧・編集・新規・削除を完結）
  {
    path: "/venues",
    name: "venues",
    component: VenuesPage,
    meta: { title: "会場" },
  },
  // #171 admin-identity-document-review (lazy import で起動コスト最小化)
  {
    path: "/identity-documents",
    name: "identity-documents",
    component: () => import("@/pages/IdentityDocumentsListPage.vue"),
    meta: { title: "本人確認書類" },
  },
  {
    path: "/identity-documents/:id",
    name: "identity-document-detail",
    component: () => import("@/pages/IdentityDocumentDetailPage.vue"),
    meta: { title: "本人確認書類" },
  },
  {
    path: "/login",
    name: "login",
    component: LoginPage,
    meta: { public: true },
  },
  {
    path: "/auth/callback",
    name: "auth-callback",
    component: AuthCallbackPage,
    meta: { public: true },
  },
  { path: "/mfa", name: "mfa", component: MfaChallengePage },
  { path: "/mfa/setup", name: "mfa-setup", component: MfaSetupPage },
];

export function registerAuthGuard(router: Router): void {
  router.beforeEach(
    async (
      to: RouteLocationNormalized,
    ): Promise<boolean | RouteLocationRaw> => {
      const session = useAuthSession();
      await session.ready();

      const isPublic = to.meta?.public === true;
      const authed = session.status.value === "authenticated";
      const aal = session.aal.value;
      const admin = session.isAdmin.value;
      const hasFactor = session.hasMfaFactor.value;

      // 公開ルート
      if (isPublic) {
        if (
          to.name === "login" &&
          authed &&
          aal === "aal2" &&
          admin === true
        ) {
          // #149 ログイン済み admin の着地先は dashboard
          return { name: "dashboard" };
        }
        return true;
      }

      // 未認証
      if (!authed) {
        return { name: "login" };
      }

      // AAL1 中
      if (aal === "aal1") {
        if (to.name === "mfa" || to.name === "mfa-setup") {
          return true;
        }
        return hasFactor ? { name: "mfa" } : { name: "mfa-setup" };
      }

      // AAL2 + 非 admin
      if (admin !== true) {
        await session.signOut();
        return { name: "login", query: { reason: "not-admin" } };
      }

      // AAL2 + admin が /mfa, /mfa/setup へ来たら dashboard (#149)
      if (to.name === "mfa" || to.name === "mfa-setup") {
        return { name: "dashboard" };
      }

      return true;
    },
  );
}

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
export { routes };
