import { ref } from "vue";
import {
  createBirthday,
  createDisplayName,
  createExperienceLevel,
  createPhone,
  updateMyMember,
  validateOptionalNickname,
} from "@/entities/member";
import type { ExperienceLevel } from "@/entities/member";
import type { AuthError } from "../types";
import { useAuthSession } from "./useAuthSession";

export type ProfileFormData = {
  display_name: string;
  nickname: string;
  birthday: string;
  phone: string;
  experience_level: string;
  terms_agreed: boolean;
};

type SubmitStatus = "idle" | "loading" | "success" | "error";

export type ProfileFieldErrors = Partial<
  Record<
    | "display_name"
    | "nickname"
    | "birthday"
    | "phone"
    | "experience_level"
    | "terms",
    string
  >
>;

/**
 * Signup 段階 2 (情報入力 + members UPDATE) の composable。
 *
 * 認証済み + プロフィール未完成の会員が /signup/profile で利用する。
 * 全フィールドを Smart constructor でバリデーション → updateMyMember →
 * useAuthSession.refresh() で完成判定を再評価。
 */
export function useCompleteProfile() {
  const status = ref<SubmitStatus>("idle");
  const error = ref<AuthError | null>(null);
  const fieldErrors = ref<ProfileFieldErrors>({});
  const session = useAuthSession();

  async function submit(form: ProfileFormData): Promise<void> {
    error.value = null;
    fieldErrors.value = {};

    const errs: ProfileFieldErrors = {};

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
      error.value = "validation";
      return;
    }

    const userId = session.session.value?.user.id;
    if (!userId) {
      status.value = "error";
      error.value = "unknown";
      return;
    }

    status.value = "loading";
    try {
      await updateMyMember(userId, {
        displayName,
        nickname,
        birthday,
        phone,
        experienceLevel: experience as ExperienceLevel,
        termsAgreedAt: new Date().toISOString(),
      });
      await session.refresh();
      status.value = "success";
    } catch (e: unknown) {
      status.value = "error";
      error.value = classifyError(e);
    }
  }

  function reset(): void {
    status.value = "idle";
    error.value = null;
    fieldErrors.value = {};
  }

  return { status, error, fieldErrors, submit, reset };
}

function classifyError(e: unknown): AuthError {
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
