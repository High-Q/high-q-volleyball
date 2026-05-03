import type {
  AuthChangeEvent,
  Session,
  Subscription,
} from "@supabase/supabase-js";
import { getSupabase } from "@/shared/api/supabase";

const CALLBACK_PATH = "/auth/callback";

export type SendOptions = {
  shouldCreateUser: boolean;
};

export async function sendMagicLink(
  email: string,
  options: SendOptions,
): Promise<void> {
  const supabase = getSupabase();
  const redirectTo = `${window.location.origin}${CALLBACK_PATH}`;
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
