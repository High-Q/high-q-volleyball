/**
 * LINE Messaging API（push message）でオーナーへ通知する。
 * 秘密（channel access token）と宛先（user ID）は呼び出し側が Secrets から渡す。
 * 送信の成否は Result 的に返し、失敗の Sentry 記録は結線側（オーケストレーション）に委ねる。
 */

/** LINE push message エンドポイント。 */
export const LINE_PUSH_ENDPOINT = "https://api.line.me/v2/bot/message/push";

/** LINE テキストメッセージ 1 通の最大文字数。超過は 400 になるため切り詰める。 */
export const LINE_TEXT_MAX = 5000;

export interface LinePushConfig {
  /** channel access token（long-lived）。 */
  channelToken: string;
  /** 送信先 user ID（`U` 始まり）。 */
  toUserId: string;
}

export type LinePushResult =
  | { ok: true; status: number }
  | { ok: false; status: number; error: string };

/** push で参照する最小レスポンス（グローバル `Response` に構造的に含まれる）。 */
export interface LineFetchResponse {
  ok: boolean;
  status: number;
  statusText: string;
  text(): Promise<string>;
}

/**
 * 差し替え可能な最小 fetch。既定のグローバル `fetch` を割り当て可能。
 * `@types/node`（undici-types）と lib.dom の `Response` 型ドリフトを避けるため、
 * 実 `Response` 全体ではなく必要な形だけに依存する。
 */
export type LineFetch = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string },
) => Promise<LineFetchResponse>;

/** 末尾省略記号つきで最大長に収める。 */
function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const ellipsis = "…（省略）";
  return text.slice(0, max - ellipsis.length) + ellipsis;
}

/**
 * 整形済みテキストを push する。`fetchImpl` は差し替え可能（既定はグローバル fetch）。
 * 空文字は送らず、HTTP エラー・ネットワーク例外は握って `ok:false` を返す
 * （通知パイプラインを静かに落とさず、呼び出し側が Sentry に記録できるように）。
 */
export async function pushLineMessage(
  config: LinePushConfig,
  text: string,
  fetchImpl: LineFetch = fetch,
): Promise<LinePushResult> {
  if (!text.trim()) {
    return { ok: false, status: 0, error: "empty message" };
  }

  let res: LineFetchResponse;
  try {
    res = await fetchImpl(LINE_PUSH_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.channelToken}`,
      },
      body: JSON.stringify({
        to: config.toUserId,
        messages: [{ type: "text", text: truncate(text, LINE_TEXT_MAX) }],
      }),
    });
  } catch (e) {
    return {
      ok: false,
      status: 0,
      error: e instanceof Error ? e.message : String(e),
    };
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return { ok: false, status: res.status, error: body || res.statusText };
  }
  return { ok: true, status: res.status };
}
