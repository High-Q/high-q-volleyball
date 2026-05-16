// メール送信ポリシー（環境別の送信抑制ガード）。
//
// 用途:
//   - dev / preview / 本番のいずれの環境でも同じ Edge Function コードが動くが、
//     dev / preview では会員アドレスへの実送信を抑制 / 制限したい
//   - 本ファイルは純粋関数だけを export し、Deno.env 等の I/O は呼び出し側で注入する
//
// 環境変数:
//   - MAIL_SUPPRESS_SEND="true"      : すべての送信を抑制（dev / preview の既定）
//   - MAIL_ALLOWED_RECIPIENTS="a@x.com,b@y.com"
//                                    : 指定アドレスにのみ送信、それ以外は抑制（preview などで翔太郎くん自身宛のみ実送信したいとき用）
//   - どちらも未設定 / 空のときは全宛先に通常送信（本番の既定）

export type MailPolicy = {
  suppress: boolean;
  allowList: string[] | null; // null = 全宛先許可
};

export type EnvLike = {
  get(name: string): string | undefined;
};

export function loadMailPolicy(env: EnvLike): MailPolicy {
  const suppress =
    (env.get("MAIL_SUPPRESS_SEND") ?? "").trim().toLowerCase() === "true";
  const allowRaw = (env.get("MAIL_ALLOWED_RECIPIENTS") ?? "").trim();
  const allowList =
    allowRaw.length > 0
      ? allowRaw
          .split(",")
          .map((s) => s.trim().toLowerCase())
          .filter((s) => s.length > 0)
      : null;
  return { suppress, allowList };
}

export function shouldSuppressSend(
  policy: MailPolicy,
  recipient: string,
): boolean {
  if (policy.suppress) return true;
  if (policy.allowList === null) return false;
  return !policy.allowList.includes(recipient.trim().toLowerCase());
}
