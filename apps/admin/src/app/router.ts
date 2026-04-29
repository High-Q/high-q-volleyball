import {
  createRouter,
  createWebHistory,
  type RouteLocationNormalized,
  type RouteLocationRaw,
  type RouteRecordRaw,
  type Router,
} from "vue-router";
import HomePlaceholder from "@/pages/HomePlaceholder.vue";
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
 */
const routes: RouteRecordRaw[] = [
  { path: "/", name: "home", component: HomePlaceholder },
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
          return { name: "home" };
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

      // AAL2 + admin が /mfa, /mfa/setup へ来たら /
      if (to.name === "mfa" || to.name === "mfa-setup") {
        return { name: "home" };
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
