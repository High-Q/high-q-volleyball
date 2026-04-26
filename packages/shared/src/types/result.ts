/**
 * Result<T, E> — 成功 / 失敗を区別する代数的データ型。
 *
 * 「エラー」を例外で投げるのではなく、関数の戻り値として返すことで、
 * 呼び出し側に明示的なハンドリングを強制する。
 *
 * 用例:
 *   const result = createEventId(input);
 *   if (!result.ok) {
 *     console.error(result.error.code);
 *     return;
 *   }
 *   useEventId(result.value);
 *
 * 関連: CLAUDE.md Pillar 2「Result<T> 型で技術エラーとビジネス異常系を区別」
 */

export type Ok<T> = { ok: true; value: T };
export type Err<E> = { ok: false; error: E };
export type Result<T, E = AppError> = Ok<T> | Err<E>;

/**
 * AppError — アプリケーション全体で扱うエラー型。
 * 必ず `code` を持ち、UI でコードに応じた具体的なフィードバックを返せるようにする。
 *
 * code 命名規則: SCREAMING_SNAKE_CASE で領域 + 内容（例: VALIDATION_INVALID_UUID）
 */
export type AppError = {
  code: string;
  message: string;
  cause?: unknown;
};

export function ok<T>(value: T): Ok<T> {
  return { ok: true, value };
}

export function err<E = AppError>(error: E): Err<E> {
  return { ok: false, error };
}

/**
 * AppError を作成するヘルパー。
 */
export function appError(
  code: string,
  message: string,
  cause?: unknown
): AppError {
  return cause === undefined ? { code, message } : { code, message, cause };
}
