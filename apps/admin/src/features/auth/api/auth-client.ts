import type {
  AuthChangeEvent,
  Session,
  Subscription,
} from "@supabase/supabase-js";
import { getSupabase } from "@/shared/api/supabase";
import type { Aal } from "../types";

/**
 * features/auth — Supabase Auth の薄いラッパー。
 *
 * - composable がテストしやすくなるよう、SDK の細かな戻り値を整形する
 * - throw で error を伝える（呼び出し側 composable で discriminated union に変換）
 *
 * 関連:
 *   openspec/changes/admin-login-magic-link/specs/admin-auth/spec.md
 *   openspec/changes/admin-login-magic-link/design.md
 */

const CALLBACK_PATH = "/auth/callback";

export async function sendMagicLink(email: string): Promise<void> {
  const supabase = getSupabase();
  const redirectTo = `${window.location.origin}${CALLBACK_PATH}`;
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: redirectTo,
    },
  });
  if (error) {
    throw error;
  }
}

export async function checkIsAdmin(): Promise<boolean> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("is_admin");
  if (error) {
    throw error;
  }
  return data === true;
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

export async function getAal(): Promise<{ currentLevel: Aal; nextLevel: Aal }> {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error) {
    throw error;
  }
  return {
    currentLevel: (data?.currentLevel ?? "aal1") as Aal,
    nextLevel: (data?.nextLevel ?? "aal1") as Aal,
  };
}

export type MfaFactor = {
  id: string;
  status: "verified" | "unverified";
  friendly_name?: string;
};

export async function listMfaFactors(): Promise<MfaFactor[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) {
    throw error;
  }
  return (data?.totp ?? []) as MfaFactor[];
}

export type EnrollTotpResult = {
  factorId: string;
  qrCode: string;
  secret: string;
  uri: string;
};

export async function enrollTotp(): Promise<EnrollTotpResult> {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
  });
  if (error) {
    throw error;
  }
  if (!data) {
    throw new Error("MFA enroll returned no data");
  }
  return {
    factorId: data.id,
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
    uri: data.totp.uri,
  };
}

export async function challengeMfa(factorId: string): Promise<string> {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.mfa.challenge({ factorId });
  if (error) {
    throw error;
  }
  if (!data) {
    throw new Error("MFA challenge returned no data");
  }
  return data.id;
}

export async function verifyMfa(
  factorId: string,
  challengeId: string,
  code: string,
): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId,
    code,
  });
  if (error) {
    throw error;
  }
}
