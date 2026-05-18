// signup payload の Edge Function 側バリデーション
//
// クライアント側にも同等のバリデーションを置くが、Edge Function は信頼境界のため
// 必ずサーバ側でも同じ規則を再評価する。アプリ層の Smart constructor と同じ規則を維持する。

export type ValidationError = {
  field: string;
  message: string;
};

export type SignupPayload = {
  email: string;
  display_name: string;
  birthday: string; // YYYY-MM-DD
  phone: string;
  experience_level: "beginner" | "intermediate" | "experienced";
  nickname: string | null; // 任意
  terms_agreed_at: string; // ISO8601
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_DIGITS_RE = /^\d+$/;
const NICKNAME_RE = /^[ぁ-ゖァ-ヺー一-鿿a-zA-Z]+$/u;
const EXPERIENCE_LEVELS = ["beginner", "intermediate", "experienced"] as const;

export function validateSignupPayload(
  raw: unknown,
): { ok: true; payload: SignupPayload } | { ok: false; errors: ValidationError[] } {
  const errors: ValidationError[] = [];
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, errors: [{ field: "_root", message: "payload が不正です" }] };
  }
  const data = raw as Record<string, unknown>;

  const email = typeof data.email === "string" ? data.email.trim().toLowerCase() : "";
  if (!email) {
    errors.push({ field: "email", message: "メールアドレスを入力してください" });
  } else if (!EMAIL_RE.test(email)) {
    errors.push({ field: "email", message: "メールアドレスの形式が正しくありません" });
  }

  const display_name = typeof data.display_name === "string" ? data.display_name.trim() : "";
  if (!display_name) {
    errors.push({ field: "display_name", message: "お名前を入力してください" });
  } else if (display_name.length > 50) {
    errors.push({ field: "display_name", message: "お名前は 50 文字以内で入力してください" });
  }

  const birthday = typeof data.birthday === "string" ? data.birthday.trim() : "";
  if (!birthday) {
    errors.push({ field: "birthday", message: "生年月日を入力してください" });
  } else {
    const parsed = new Date(birthday);
    if (Number.isNaN(parsed.getTime())) {
      errors.push({ field: "birthday", message: "生年月日が正しくありません" });
    } else {
      const now = new Date();
      const oldest = new Date(now.getFullYear() - 100, now.getMonth(), now.getDate());
      if (parsed > now) {
        errors.push({ field: "birthday", message: "生年月日は過去の日付を入力してください" });
      } else if (parsed < oldest) {
        errors.push({ field: "birthday", message: "生年月日が正しくありません" });
      }
    }
  }

  const phone_raw = typeof data.phone === "string" ? data.phone : "";
  // ハイフン・空白を除去して 11 桁国内携帯番号
  const phone_digits = phone_raw.replace(/[\s\-‐−ー]/g, "");
  let phone_normalized = "";
  if (!phone_digits) {
    errors.push({ field: "phone", message: "電話番号を入力してください（当日連絡用）" });
  } else if (!PHONE_DIGITS_RE.test(phone_digits)) {
    errors.push({ field: "phone", message: "電話番号は数字とハイフンのみで入力してください" });
  } else if (phone_digits.length !== 11) {
    errors.push({ field: "phone", message: "電話番号の桁数が正しくありません" });
  } else if (!/^0[789]0/.test(phone_digits)) {
    errors.push({
      field: "phone",
      message: "携帯電話番号（070 / 080 / 090 で始まる番号）を入力してください",
    });
  } else {
    phone_normalized = `${phone_digits.slice(0, 3)}-${phone_digits.slice(3, 7)}-${phone_digits.slice(7)}`;
  }

  const experience_level = typeof data.experience_level === "string" ? data.experience_level : "";
  if (!EXPERIENCE_LEVELS.includes(experience_level as typeof EXPERIENCE_LEVELS[number])) {
    errors.push({ field: "experience_level", message: "経験レベルを選択してください" });
  }

  let nickname: string | null = null;
  const nickname_raw = typeof data.nickname === "string" ? data.nickname.trim() : "";
  if (nickname_raw.length > 0) {
    if (nickname_raw.length > 15) {
      errors.push({
        field: "nickname",
        message: "ニックネームは 15 文字以内で入力してください",
      });
    } else if (!NICKNAME_RE.test(nickname_raw)) {
      errors.push({
        field: "nickname",
        message:
          "ニックネームは日本語と英字のみで入力してください（数字・記号・絵文字は使えません）",
      });
    } else {
      nickname = nickname_raw;
    }
  }

  const terms_agreed_at = typeof data.terms_agreed_at === "string" ? data.terms_agreed_at : "";
  if (!terms_agreed_at) {
    errors.push({ field: "terms", message: "利用規約への同意が必要です" });
  } else {
    const parsed = new Date(terms_agreed_at);
    if (Number.isNaN(parsed.getTime())) {
      errors.push({ field: "terms", message: "利用規約同意の記録が不正です" });
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    payload: {
      email,
      display_name,
      birthday,
      phone: phone_normalized,
      experience_level: experience_level as typeof EXPERIENCE_LEVELS[number],
      nickname,
      terms_agreed_at,
    },
  };
}

export function validateVerifyPayload(
  raw: unknown,
):
  | { ok: true; email: string; code: string }
  | { ok: false; errors: ValidationError[] } {
  const errors: ValidationError[] = [];
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, errors: [{ field: "_root", message: "payload が不正です" }] };
  }
  const data = raw as Record<string, unknown>;

  const email = typeof data.email === "string" ? data.email.trim().toLowerCase() : "";
  if (!email || !EMAIL_RE.test(email)) {
    errors.push({ field: "email", message: "メールアドレスが不正です" });
  }

  const code = typeof data.code === "string" ? data.code.trim() : "";
  if (!/^\d{6}$/.test(code)) {
    errors.push({ field: "code", message: "6 桁の数字コードを入力してください" });
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, email, code };
}

export type ReservationNotificationPayload = {
  reservationId: string;
  eventType: "confirmed" | "cancelled" | "updated";
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validateReservationNotificationPayload(
  raw: unknown,
):
  | { ok: true; payload: ReservationNotificationPayload }
  | { ok: false; errors: ValidationError[] } {
  const errors: ValidationError[] = [];
  if (typeof raw !== "object" || raw === null) {
    return {
      ok: false,
      errors: [{ field: "_root", message: "payload が不正です" }],
    };
  }
  const data = raw as Record<string, unknown>;

  const reservationId =
    typeof data.reservationId === "string" ? data.reservationId.trim() : "";
  if (!UUID_RE.test(reservationId)) {
    errors.push({
      field: "reservationId",
      message: "reservationId は UUID 形式で指定してください",
    });
  }

  const eventType = typeof data.eventType === "string" ? data.eventType : "";
  if (
    eventType !== "confirmed" &&
    eventType !== "cancelled" &&
    eventType !== "updated"
  ) {
    errors.push({
      field: "eventType",
      message:
        "eventType は 'confirmed' / 'cancelled' / 'updated' のいずれかを指定してください",
    });
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    payload: {
      reservationId,
      eventType: eventType as "confirmed" | "cancelled" | "updated",
    },
  };
}
