import {
  computed,
  inject,
  ref,
  shallowRef,
  type App,
  type ComputedRef,
  type InjectionKey,
  type Ref,
} from "vue";
import type { Session } from "@supabase/supabase-js";
import {
  checkIsAdmin,
  getAal,
  getSession,
  listMfaFactors,
  onAuthStateChange,
  signOut as signOutApi,
  type MfaFactor,
} from "../api/auth-client";
import type { Aal, AuthStatus } from "../types";

/**
 * 認証セッション state composable。
 *
 * provide/inject でアプリ全体で 1 インスタンスを共有する。
 * `installAuthSession(app)` を `app.use(router)` の前に呼ぶこと。
 *
 * 関連:
 *   openspec/changes/admin-login-magic-link/specs/admin-auth/spec.md
 *   openspec/changes/admin-login-magic-link/design.md (D3, D4, D14)
 */

export type AuthSession = {
  status: Ref<AuthStatus>;
  session: Ref<Session | null>;
  aal: Ref<Aal>;
  hasMfaFactor: Ref<boolean>;
  isAdmin: Ref<boolean | null>;
  isAuthenticated: ComputedRef<boolean>;
  ready: () => Promise<void>;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AUTH_SESSION_KEY: InjectionKey<AuthSession> = Symbol("AuthSession");

function createAuthSession(): AuthSession {
  const status = ref<AuthStatus>("loading");
  const session = shallowRef<Session | null>(null);
  const aal = ref<Aal>("aal1");
  const hasMfaFactor = ref<boolean>(false);
  const isAdmin = ref<boolean | null>(null);
  const isAuthenticated = computed<boolean>(
    () => status.value === "authenticated",
  );

  let readyPromise: Promise<void> | null = null;

  async function evaluate(): Promise<void> {
    const current = await getSession();
    session.value = current;
    if (current === null) {
      status.value = "unauthenticated";
      aal.value = "aal1";
      hasMfaFactor.value = false;
      isAdmin.value = null;
      return;
    }
    const [aalResult, factors] = await Promise.all([
      getAal(),
      listMfaFactors(),
    ]);
    aal.value = aalResult.currentLevel;
    hasMfaFactor.value = hasVerifiedFactor(factors);

    if (aal.value === "aal2") {
      try {
        isAdmin.value = await checkIsAdmin();
      } catch {
        isAdmin.value = false;
      }
    } else {
      // AAL1 中は is_admin() を呼ばない (D14)
      isAdmin.value = null;
    }
    status.value = "authenticated";
  }

  function ready(): Promise<void> {
    if (readyPromise === null) {
      readyPromise = evaluate();
    }
    return readyPromise;
  }

  async function refresh(): Promise<void> {
    await evaluate();
  }

  async function signOut(): Promise<void> {
    try {
      await signOutApi();
    } finally {
      session.value = null;
      aal.value = "aal1";
      hasMfaFactor.value = false;
      isAdmin.value = null;
      status.value = "unauthenticated";
    }
  }

  // SDK の subscribe は install 時に 1 度だけ作る
  onAuthStateChange((_event, _next) => {
    void evaluate();
  });

  return {
    status,
    session,
    aal,
    hasMfaFactor,
    isAdmin,
    isAuthenticated,
    ready,
    refresh,
    signOut,
  };
}

function hasVerifiedFactor(factors: MfaFactor[]): boolean {
  return factors.some((f) => f.status === "verified");
}

export function installAuthSession(app: App): AuthSession {
  const instance = createAuthSession();
  app.provide(AUTH_SESSION_KEY, instance);
  return instance;
}

export function useAuthSession(): AuthSession {
  const instance = inject(AUTH_SESSION_KEY, null);
  if (instance === null) {
    throw new Error(
      "useAuthSession() must be called after installAuthSession(app).",
    );
  }
  return instance;
}

export { AUTH_SESSION_KEY };
