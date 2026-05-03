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
import { fetchMyMember, isProfileComplete } from "@/entities/member";
import type { Member } from "@/entities/member";
import type { AuthStatus } from "../types";

export type AuthSession = {
  status: Ref<AuthStatus>;
  session: Ref<Session | null>;
  member: Ref<Member | null>;
  isProfileComplete: ComputedRef<boolean>;
  isAuthenticated: ComputedRef<boolean>;
  ready: () => Promise<void>;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AUTH_SESSION_KEY: InjectionKey<AuthSession> = Symbol("ReservationAuthSession");

function createAuthSession(): AuthSession {
  const status = ref<AuthStatus>("loading");
  const session = shallowRef<Session | null>(null);
  const member = shallowRef<Member | null>(null);
  const isProfileCompleteRef = computed<boolean>(() => isProfileComplete(member.value));
  const isAuthenticated = computed<boolean>(() => status.value === "authenticated");

  let readyPromise: Promise<void> | null = null;

  async function evaluate(): Promise<void> {
    const current = await getSession();
    session.value = current;
    if (current === null) {
      status.value = "unauthenticated";
      member.value = null;
      return;
    }
    try {
      member.value = await fetchMyMember(current.user.id);
    } catch {
      member.value = null;
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
      member.value = null;
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
