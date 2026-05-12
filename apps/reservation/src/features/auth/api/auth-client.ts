import type {
  AuthChangeEvent,
  Session,
  Subscription,
} from "@supabase/supabase-js";
import { getSupabase } from "@/shared/api/supabase";

const CALLBACK_PATH = "/auth/callback";

export type SendOptions = {
  shouldCreateUser: boolean;
  /**
   * 認証完了後に navigate させたいパス (LP からのイベント指定遷移等)。
   * `emailRedirectTo` の URL に `?next=<encoded>` として埋め込まれ、
   * `/auth/callback` 側で復元される。値の安全性は呼び出し側が `safeNextPath`
   * で事前に検証することを前提とする (Issue #229)。
   */
  next?: string | null;
};

export async function sendMagicLink(
  email: string,
  options: SendOptions,
): Promise<void> {
  const supabase = getSupabase();
  const url = new URL(CALLBACK_PATH, window.location.origin);
  if (options.next) {
    url.searchParams.set("next", options.next);
  }
  const redirectTo = url.toString();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: options.shouldCreateUser,
      emailRedirectTo: redirectTo,
    },
  });
  if (error) {
    throw error;
  }
}

export async function signOut(): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
}

export async function getSession(): Promise<Session | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw error;
  }
  return data.session ?? null;
}

export function onAuthStateChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void,
): Subscription {
  const supabase = getSupabase();
  const { data } = supabase.auth.onAuthStateChange(callback);
  return data.subscription;
}
