import {
  createRouter,
  createWebHistory,
  type RouteLocationNormalized,
  type RouteLocationRaw,
  type RouteRecordRaw,
  type Router,
} from "vue-router";
import EventsListPage from "@/pages/EventsListPage.vue";
import EventDetailPage from "@/pages/EventDetailPage.vue";
import LoginPage from "@/pages/LoginPage.vue";
import SignupProfilePage from "@/pages/SignupProfilePage.vue";
import LinkSentPage from "@/pages/LinkSentPage.vue";
import AuthCallbackPage from "@/pages/AuthCallbackPage.vue";
import { useAuthSession } from "@/features/auth";

const routes: RouteRecordRaw[] = [
  // / は認証必須。プロフィール完成済みユーザーは /events にリダイレクトされる
  // (#90: HomePlaceholder 廃止、イベント一覧をホームに昇格)。
  { path: "/", name: "home", redirect: { name: "events-list" } },
  {
    path: "/events",
    name: "events-list",
    component: EventsListPage,
  },
  {
    path: "/events/:id",
    name: "event-detail",
    component: EventDetailPage,
  },
  {
    path: "/login",
    name: "login",
    component: LoginPage,
    meta: { public: true },
  },
  // /signup ルートは撤廃 (2026-05-03 翔太郎くん指示)。
  // 段階 1 (メール送信) は /login で兼用するため不要。
  // /signup/profile は段階 2、/signup/identity は段階 3 (#92) として運用。
  {
    path: "/signup/profile",
    name: "signup-profile",
    component: SignupProfilePage,
  },
  {
    path: "/signup/identity",
    name: "signup-identity",
    component: () => import("@/pages/SignupIdentityPage.vue"),
  },
  {
    path: "/auth/callback",
    name: "auth-callback",
    component: AuthCallbackPage,
    meta: { public: true },
  },
  {
    path: "/auth/link-sent",
    name: "auth-link-sent",
    component: LinkSentPage,
    meta: { public: true },
  },
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
      const profileDone = session.isProfileComplete.value;
      const hasIdDoc = session.hasIdentityDocument.value;

      // 未認証
      if (!authed) {
        if (isPublic) return true;
        return { name: "login" };
      }

      // 認証済み + プロフィール未完成 → /signup/profile 強制誘導
      // ただし /auth/callback は通過 (callback 内でリダイレクト判定)
      if (!profileDone) {
        if (to.name === "signup-profile" || to.name === "auth-callback") {
          return true;
        }
        return { name: "signup-profile" };
      }

      // 認証済み + プロフィール完成 + 書類未提出 → /signup/identity 強制誘導 (#92)
      if (!hasIdDoc) {
        if (to.name === "signup-identity" || to.name === "auth-callback") {
          return true;
        }
        return { name: "signup-identity" };
      }

      // 認証済み + プロフィール完成 + 書類提出済み:
      // ログイン / 段階 2 / 段階 3 系は / へ
      if (
        to.name === "login" ||
        to.name === "signup-profile" ||
        to.name === "signup-identity"
      ) {
        return { name: "events-list" };
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
