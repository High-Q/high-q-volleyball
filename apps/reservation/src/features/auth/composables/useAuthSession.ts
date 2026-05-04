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
  getSession,
  onAuthStateChange,
  signOut as signOutApi,
} from "../api/auth-client";
import {
  fetchHasIdentityDocument,
  fetchMyMember,
  isProfileComplete,
} from "@/entities/member";
import type { Member } from "@/entities/member";
import type { AuthStatus } from "../types";

export type AuthSession = {
  status: Ref<AuthStatus>;
  session: Ref<Session | null>;
  member: Ref<Member | null>;
  isProfileComplete: ComputedRef<boolean>;
  isAuthenticated: ComputedRef<boolean>;
  /** 自分の identity_documents が 1 件以上存在するか (本人確認書類アップロード判定) */
  hasIdentityDocument: ComputedRef<boolean>;
  ready: () => Promise<void>;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AUTH_SESSION_KEY: InjectionKey<AuthSession> = Symbol("ReservationAuthSession");

function createAuthSession(): AuthSession {
  const status = ref<AuthStatus>("loading");
  const session = shallowRef<Session | null>(null);
  const member = shallowRef<Member | null>(null);
  const hasIdentityDoc = ref<boolean>(false);
  const isProfileCompleteRef = computed<boolean>(() => isProfileComplete(member.value));
  const isAuthenticated = computed<boolean>(() => status.value === "authenticated");
  const hasIdentityDocumentRef = computed<boolean>(() => hasIdentityDoc.value);

  let readyPromise: Promise<void> | null = null;

  async function evaluate(): Promise<void> {
    const current = await getSession();
    session.value = current;
    if (current === null) {
      status.value = "unauthenticated";
      member.value = null;
      hasIdentityDoc.value = false;
      return;
    }
    const [memberResult, idDocResult] = await Promise.allSettled([
      fetchMyMember(current.user.id),
      fetchHasIdentityDocument(current.user.id),
    ]);
    member.value = memberResult.status === "fulfilled" ? memberResult.value : null;
    hasIdentityDoc.value =
      idDocResult.status === "fulfilled" ? idDocResult.value : false;
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
      member.value = null;
      hasIdentityDoc.value = false;
      status.value = "unauthenticated";
    }
  }

  onAuthStateChange((_event, _next) => {
    void evaluate();
  });

  return {
    status,
    session,
    member,
    isProfileComplete: isProfileCompleteRef,
    isAuthenticated,
    hasIdentityDocument: hasIdentityDocumentRef,
    ready,
    refresh,
    signOut,
  };
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
