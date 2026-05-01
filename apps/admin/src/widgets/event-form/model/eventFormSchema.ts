/**
 * EventForm の純関数バリデーション。
 *
 * フォーム state（文字列ベース）を受け取り、各フィールドのエラーメッセージを
 * 返す。Submit 直前と各フィールドの blur 時で同じ関数を呼ぶ契約。
 *
 * 関連:
 *   openspec/changes/admin-events-crud-screen/specs/admin-events-crud/spec.md
 *   openspec/changes/admin-events-crud-screen/design.md (D2, §5)
 */

/**
 * フォーム state。HTML form の value をそのまま受ける文字列ベース。
 * `date` は `YYYY-MM-DD`、`startTime`/`endTime` は `HH:mm`、`venueId` は uuid、
 * `fee` は数値文字列または空文字。
 */
export interface EventFormState {
  name: string;
  date: string;
  startTime: string;
  endTime: string;
  venueId: string;
  fee: string;
}

export type EventFormErrorKey = keyof EventFormState;

export type ValidationErrors = Partial<Record<EventFormErrorKey, string>>;

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationErrors;
}

const NAME_MAX = 100;

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function isIntString(value: string): boolean {
  if (!/^-?\d+$/.test(value)) return false;
  const n = Number(value);
  return Number.isInteger(n);
}

export function emptyEventForm(): EventFormState {
  return {
    name: "",
    date: "",
    startTime: "",
    endTime: "",
    venueId: "",
    fee: "",
  };
}

export function validateEventForm(state: EventFormState): ValidationResult {
  const errors: ValidationErrors = {};

  // V1 / V2: name 必須・1-100 文字
  const trimmedName = state.name.trim();
  if (trimmedName.length === 0) {
    errors.name = "タイトルを入力してください";
  } else if (trimmedName.length > NAME_MAX) {
    errors.name = "タイトルは 100 文字以内で入力してください";
  }

  // V3: date 必須
  if (state.date.trim().length === 0) {
    errors.date = "開催日を選択してください";
  }

  // V4: startTime 必須
  if (state.startTime.trim().length === 0) {
    errors.startTime = "開始時刻を入力してください";
  }

  // V5: endTime 必須
  if (state.endTime.trim().length === 0) {
    errors.endTime = "終了時刻を入力してください";
  }

  // V6: start < end（両方値があるとき）
  if (
    !errors.startTime &&
    !errors.endTime &&
    TIME_RE.test(state.startTime) &&
    TIME_RE.test(state.endTime)
  ) {
    if (state.startTime >= state.endTime) {
      errors.endTime = "終了は開始より後にしてください";
    }
  }

  // V7: venueId 必須
  if (state.venueId.trim().length === 0) {
    errors.venueId = "会場を選択してください";
  }

  // V8: fee は任意。値ありの場合のみ検証
  if (state.fee.trim().length > 0) {
    const v = state.fee.trim();
    if (!isIntString(v) || Number(v) < 0) {
      errors.fee = "参加費は 0 以上の整数で入力してください";
    }
  }

  return { isValid: Object.keys(errors).length === 0, errors };
}
