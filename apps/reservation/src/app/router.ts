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
import SignupPage from "@/pages/SignupPage.vue";
import SignupVerifyPage from "@/pages/SignupVerifyPage.vue";
import LinkSentPage from "@/pages/LinkSentPage.vue";
import AuthCallbackPage from "@/pages/AuthCallbackPage.vue";
import ProfilePage from "@/pages/ProfilePage.vue";
import HistoryPage from "@/pages/HistoryPage.vue";
import { useAuthSession } from "@/features/auth";
import { safeNextPath } from "@/shared/lib/safeNextPath";

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
    path: "/events/:id/book/done",
    name: "booking-done",
    component: () => import("@/pages/BookingDonePage.vue"),
  },
  {
    path: "/login",
    name: "login",
    component: LoginPage,
    meta: { public: true },
  },
  // 会員登録 3 段階:
  //   段階 1 (/signup): 全項目入力 → 認証コード送信 (#189 ゼロ滞留 signup フロー)
  //   段階 2 (/signup/verify): 6 桁コード入力 → auth.users + members 一括作成
  //   段階 3 (/signup/identity): 本人確認書類アップロード (#92)
  // /signup/profile は #189 で撤廃済み。
  {
    path: "/signup",
    name: "signup",
    component: SignupPage,
    meta: { public: true },
  },
  {
    path: "/signup/verify",
    name: "signup-verify",
    component: SignupVerifyPage,
    meta: { public: true },
  },
  {
    path: "/signup/identity",
    name: "signup-identity",
    component: () => import("@/pages/SignupIdentityPage.vue"),
  },
  {
    path: "/profile",
    name: "profile",
    component: ProfilePage,
  },
  {
    path: "/history",
    name: "history",
    component: HistoryPage,
  },
  {
    path: "/reservations/:reservationId",
    name: "reservation-detail",
    component: () => import("@/pages/ReservationDetailPage.vue"),
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
      const hasIdDoc = session.hasIdentityDocument.value;

      // 未認証
      if (!authed) {
        if (isPublic) return true;
        // #229: LP からのイベント指定遷移等で元の遷移先を `next` クエリに保持
        // して /login にリダイレクトする。値は safeNextPath で正規化済み。
        const candidateNext = safeNextPath(to.fullPath);
        if (candidateNext) {
          return { name: "login", query: { next: candidateNext } };
        }
        return { name: "login" };
      }

      // #189 ゼロ滞留 signup フロー導入後、認証済み = プロフィール完成済みが
      // 不変条件となるため「プロフィール未完成→ /signup/profile 誘導」分岐は
      // 撤廃済み。Phase 1 で作成された既存会員行は signup_completed=true 持ち。

      // 認証済み + 書類未提出 → /signup/identity 強制誘導 (#92)
      // ただし #229 で `next` を持つ場合は、書類提出後に next 先へ navigate
      // するために本リダイレクトでも `next` を引き継ぐ。
      if (!hasIdDoc) {
        if (to.name === "signup-identity" || to.name === "auth-callback") {
          return true;
        }
        const carriedNext = safeNextPath(toQueryString(to.query.next));
        if (carriedNext) {
          return {
            name: "signup-identity",
            query: { next: carriedNext },
          };
        }
        return { name: "signup-identity" };
      }

      // 認証済み + 書類提出済み:
      // ログイン / 新規登録 / 段階 3 系は本来 / にリダイレクトするが、
      // #229: `next` クエリが安全であればそこに直接 navigate する。
      if (
        to.name === "login" ||
        to.name === "signup" ||
        to.name === "signup-verify" ||
        to.name === "signup-identity"
      ) {
        const carriedNext = safeNextPath(toQueryString(to.query.next));
        if (carriedNext) {
          return carriedNext;
        }
        return { name: "events-list" };
      }

      return true;
    },
  );
}

/**
 * vue-router の `LocationQueryValue | LocationQueryValue[]` を文字列に正規化する。
 * 配列・null は `null` を返し、`safeNextPath` 側の `typeof string` 判定で却下される。
 */
function toQueryString(
  v: unknown,
): string | null {
  return typeof v === "string" ? v : null;
}

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
export { routes };
