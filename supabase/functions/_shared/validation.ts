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
  // #281: お名前は last_name / first_name の 2 属性に分離。display_name は受け取らない。
  last_name: string;
  first_name: string;
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

  // #281: 姓・名 2 フィールド。それぞれ 1〜32 文字必須。
  const last_name = typeof data.last_name === "string" ? data.last_name.trim() : "";
  if (!last_name) {
    errors.push({ field: "last_name", message: "姓を入力してください" });
  } else if (last_name.length > 32) {
    errors.push({ field: "last_name", message: "姓は 32 文字以内で入力してください" });
  }

  const first_name = typeof data.first_name === "string" ? data.first_name.trim() : "";
  if (!first_name) {
    errors.push({ field: "first_name", message: "名を入力してください" });
  } else if (first_name.length > 32) {
    errors.push({ field: "first_name", message: "名は 32 文字以内で入力してください" });
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
      last_name,
      first_name,
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

export type IdentityDocumentPendingNotificationPayload = {
  identityDocumentId: string;
};

export function validateIdentityDocumentPendingNotificationPayload(
  raw: unknown,
):
  | { ok: true; payload: IdentityDocumentPendingNotificationPayload }
  | { ok: false; errors: ValidationError[] } {
  const errors: ValidationError[] = [];
  if (typeof raw !== "object" || raw === null) {
    return {
      ok: false,
      errors: [{ field: "_root", message: "payload が不正です" }],
    };
  }
  const data = raw as Record<string, unknown>;

  const identityDocumentId =
    typeof data.identityDocumentId === "string"
      ? data.identityDocumentId.trim()
      : "";
  if (!UUID_RE.test(identityDocumentId)) {
    errors.push({
      field: "identityDocumentId",
      message: "identityDocumentId は UUID 形式で指定してください",
    });
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    payload: { identityDocumentId },
  };
}

export type EventCancellationRecipient = {
  memberId: string;
  email: string;
};

export type EventCancellationNotificationPayload = {
  eventId: string;
  eventName: string;
  startAtJst: string;
  venueName: string;
  snapshotRecipients: EventCancellationRecipient[];
  organizerMessage?: string;
};

const ORGANIZER_MESSAGE_MAX = 500;

export function validateEventCancellationNotificationPayload(
  raw: unknown,
):
  | { ok: true; payload: EventCancellationNotificationPayload }
  | { ok: false; errors: ValidationError[] } {
  const errors: ValidationError[] = [];
  if (typeof raw !== "object" || raw === null) {
    return {
      ok: false,
      errors: [{ field: "_root", message: "payload が不正です" }],
    };
  }
  const data = raw as Record<string, unknown>;

  const eventId = typeof data.eventId === "string" ? data.eventId.trim() : "";
  if (!UUID_RE.test(eventId)) {
    errors.push({
      field: "eventId",
      message: "eventId は UUID 形式で指定してください",
    });
  }

  const eventName =
    typeof data.eventName === "string" ? data.eventName.trim() : "";
  if (!eventName) {
    errors.push({ field: "eventName", message: "eventName を指定してください" });
  }

  const startAtJst =
    typeof data.startAtJst === "string" ? data.startAtJst.trim() : "";
  if (!startAtJst) {
    errors.push({
      field: "startAtJst",
      message: "startAtJst を指定してください",
    });
  }

  const venueName =
    typeof data.venueName === "string" ? data.venueName.trim() : "";
  if (!venueName) {
    errors.push({ field: "venueName", message: "venueName を指定してください" });
  }

  let snapshotRecipients: EventCancellationRecipient[] = [];
  if (!Array.isArray(data.snapshotRecipients)) {
    errors.push({
      field: "snapshotRecipients",
      message: "snapshotRecipients は配列で指定してください",
    });
  } else if (data.snapshotRecipients.length === 0) {
    errors.push({
      field: "snapshotRecipients",
      message: "snapshotRecipients が空です",
    });
  } else {
    const seenMemberIds = new Set<string>();
    const accepted: EventCancellationRecipient[] = [];
    data.snapshotRecipients.forEach((row, idx) => {
      if (typeof row !== "object" || row === null) {
        errors.push({
          field: `snapshotRecipients[${idx}]`,
          message: "受信者レコードが不正です",
        });
        return;
      }
      const r = row as Record<string, unknown>;
      const memberId = typeof r.memberId === "string" ? r.memberId.trim() : "";
      const email =
        typeof r.email === "string" ? r.email.trim().toLowerCase() : "";
      if (!UUID_RE.test(memberId)) {
        errors.push({
          field: `snapshotRecipients[${idx}].memberId`,
          message: "memberId は UUID 形式で指定してください",
        });
        return;
      }
      if (!EMAIL_RE.test(email)) {
        errors.push({
          field: `snapshotRecipients[${idx}].email`,
          message: "email の形式が正しくありません",
        });
        return;
      }
      if (seenMemberIds.has(memberId)) {
        // 重複 memberId はサイレントに 1 件にまとめる (Edge Function 側でも重複排除)
        return;
      }
      seenMemberIds.add(memberId);
      accepted.push({ memberId, email });
    });
    snapshotRecipients = accepted;
  }

  let organizerMessage: string | undefined;
  if (data.organizerMessage !== undefined && data.organizerMessage !== null) {
    if (typeof data.organizerMessage !== "string") {
      errors.push({
        field: "organizerMessage",
        message: "organizerMessage は文字列で指定してください",
      });
    } else if (data.organizerMessage.length > ORGANIZER_MESSAGE_MAX) {
      errors.push({
        field: "organizerMessage",
        message: `organizerMessage は ${ORGANIZER_MESSAGE_MAX} 文字以内で指定してください`,
      });
    } else {
      const trimmed = data.organizerMessage.trim();
      organizerMessage = trimmed.length > 0 ? trimmed : undefined;
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    payload: {
      eventId,
      eventName,
      startAtJst,
      venueName,
      snapshotRecipients,
      organizerMessage,
    },
  };
}
