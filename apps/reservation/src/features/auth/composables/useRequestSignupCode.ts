import { ref } from "vue";
import { getSupabase } from "@/shared/api/supabase";
import {
  createBirthday,
  createDisplayName,
  createExperienceLevel,
  createPhone,
  validateOptionalNickname,
} from "@/entities/member";
import type { ExperienceLevel } from "@/entities/member";

export type SignupFormData = {
  email: string;
  display_name: string;
  nickname: string;
  birthday: string;
  phone: string;
  experience_level: string;
  terms_agreed: boolean;
};

type Status = "idle" | "loading" | "success" | "error";

export type SignupFieldErrors = Partial<
  Record<
    | "email"
    | "display_name"
    | "nickname"
    | "birthday"
    | "phone"
    | "experience_level"
    | "terms",
    string
  >
>;

export type SignupErrorCode =
  | "validation"
  | "already-registered"
  | "rate-limited"
  | "network"
  | "mail-send-failed"
  | "unknown";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Issue #189 ゼロ滞留 signup フローの段階 1 composable。
 * /signup フォームから Edge Function `request-signup` を呼び、
 * 認証コードメール送信までを担当する。auth.users / members は本段階では作成されない。
 */
export function useRequestSignupCode() {
  const status = ref<Status>("idle");
  const errorCode = ref<SignupErrorCode | null>(null);
  const fieldErrors = ref<SignupFieldErrors>({});
  const expiresAt = ref<string | null>(null);
  const retryAfterSec = ref<number | null>(null);

  async function submit(form: SignupFormData): Promise<boolean> {
    errorCode.value = null;
    fieldErrors.value = {};
    expiresAt.value = null;
    retryAfterSec.value = null;

    const errs: SignupFieldErrors = {};

    const email = form.email.trim().toLowerCase();
    if (!email) {
      errs.email = "メールアドレスを入力してください";
    } else if (!EMAIL_RE.test(email)) {
      errs.email = "メールアドレスの形式が正しくありません";
    }

    if (!form.terms_agreed) {
      errs.terms = "利用規約とプライバシーポリシーへの同意が必要です";
    }

    let displayName = "";
    try {
      displayName = createDisplayName(form.display_name);
    } catch (e) {
      errs.display_name = (e as Error).message;
    }

    let nickname: string | null = null;
    try {
      nickname = validateOptionalNickname(form.nickname);
    } catch (e) {
      errs.nickname = (e as Error).message;
    }

    let birthday = "";
    try {
      birthday = createBirthday(form.birthday);
    } catch (e) {
      errs.birthday = (e as Error).message;
    }

    let phone = "";
    try {
      phone = createPhone(form.phone);
    } catch (e) {
      errs.phone = (e as Error).message;
    }

    let experience: ExperienceLevel | "" = "";
    try {
      experience = createExperienceLevel(form.experience_level);
    } catch (e) {
      errs.experience_level = (e as Error).message;
    }

    if (Object.keys(errs).length > 0) {
      fieldErrors.value = errs;
      status.value = "error";
      errorCode.value = "validation";
      return false;
    }

    status.value = "loading";

    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.functions.invoke("request-signup", {
        body: {
          email,
          display_name: displayName,
          birthday,
          phone,
          experience_level: experience,
          nickname,
          terms_agreed_at: new Date().toISOString(),
        },
      });

      if (error) {
        // supabase-js の functions.invoke は 4xx/5xx の場合 data を null にして
        // error.context (Response) に body を保持する。明示的に json() で読み出す。
        let detail: {
          error?: string;
          fieldErrors?: { field: string; message: string }[];
          retryAfter?: number;
        } | null = (data ?? null) as typeof detail;
        if (!detail) {
          const ctx = (error as { context?: Response }).context;
          if (ctx && typeof ctx.json === "function") {
            try {
              detail = await ctx.json();
            } catch {
              detail = null;
            }
          }
        }
        if (detail?.error === "already-registered") {
          status.value = "error";
          errorCode.value = "already-registered";
          fieldErrors.value = { email: "このメールアドレスは既に登録済みです" };
          return false;
        }
        if (detail?.error === "rate-limited") {
          status.value = "error";
          errorCode.value = "rate-limited";
          retryAfterSec.value = detail.retryAfter ?? 60;
          return false;
        }
        if (detail?.error === "validation-error" && detail.fieldErrors) {
          status.value = "error";
          errorCode.value = "validation";
          const fe: SignupFieldErrors = {};
          for (const { field, message } of detail.fieldErrors) {
            (fe as Record<string, string>)[field] = message;
          }
          fieldErrors.value = fe;
          return false;
        }
        if (detail?.error === "mail-send-failed") {
          status.value = "error";
          errorCode.value = "mail-send-failed";
          return false;
        }
        // Edge Function 通信失敗 / ネットワーク
        if (/network|fetch|failed to fetch/i.test(error.message ?? "")) {
          status.value = "error";
          errorCode.value = "network";
          return false;
        }
        status.value = "error";
        errorCode.value = "unknown";
        return false;
      }

      const ok = (data ?? {}) as { ok?: boolean; expiresAt?: string };
      if (ok.ok && ok.expiresAt) {
        expiresAt.value = ok.expiresAt;
        status.value = "success";
        return true;
      }
      status.value = "error";
      errorCode.value = "unknown";
      return false;
    } catch (e: unknown) {
      status.value = "error";
      errorCode.value = classifyError(e);
      return false;
    }
  }

  function reset(): void {
    status.value = "idle";
    errorCode.value = null;
    fieldErrors.value = {};
    expiresAt.value = null;
    retryAfterSec.value = null;
  }

  return { status, errorCode, fieldErrors, expiresAt, retryAfterSec, submit, reset };
}

function classifyError(e: unknown): SignupErrorCode {
  if (typeof e === "object" && e !== null) {
    const obj = e as { message?: unknown; name?: unknown };
    const message = typeof obj.message === "string" ? obj.message : "";
    if (
      obj.name === "TypeError" ||
      /network|fetch|failed to fetch/i.test(message)
    ) {
      return "network";
    }
  }
  return "unknown";
}
