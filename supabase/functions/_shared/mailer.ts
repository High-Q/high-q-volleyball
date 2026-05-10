// Gmail SMTP 経由でメール送信するヘルパー
//
// 運用前提（design.md D4）:
//   - Google アカウント（high.q.volleyball@gmail.com）で 2FA を有効化
//   - 「アプリパスワード」機能でアプリ用パスワードを発行
//   - Edge Function の secret に GMAIL_USER / GMAIL_APP_PASSWORD を登録
//
// MAIL_FROM_NAME はブランド固定値のためコードにハードコード。Supabase Dashboard の
// Secret 入力欄で日本語マルチバイト文字が `=ef=bf=bd` (U+FFFD) に壊れる事象を回避する。
//
// 当初 `denomailer` を使用したが、UTF-8 ヘッダーの Q-encode で
// マルチバイト文字を U+FFFD（=ef=bf=bd）に壊す + 本文 quoted-printable が
// Gmail で raw 表示される問題が出たため、Node.js 標準の `nodemailer` を
// `npm:` specifier 経由で利用する。Supabase Edge Functions は Deno 2 で
// npm パッケージをそのまま使える。

import nodemailer from "npm:nodemailer@6.9.16";

export type MailEnv = {
  user: string;
  password: string;
  fromName: string;
};

const FROM_NAME = "High Q バレーボールサークル";

export function loadMailEnv(): MailEnv {
  const user = Deno.env.get("GMAIL_USER");
  const password = Deno.env.get("GMAIL_APP_PASSWORD");
  if (!user || !password) {
    throw new Error(
      "Gmail SMTP 設定が不足しています（GMAIL_USER / GMAIL_APP_PASSWORD を Edge Function secret に登録してください）",
    );
  }
  return { user, password, fromName: FROM_NAME };
}

export async function sendMail(
  env: MailEnv,
  to: string,
  subject: string,
  body: string,
): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: env.user,
      pass: env.password,
    },
  });

  await transporter.sendMail({
    from: { name: env.fromName, address: env.user },
    to,
    subject,
    text: body,
  });
}

export function renderSignupCodeMail(code: string): {
  subject: string;
  body: string;
} {
  return {
    subject: "【High Q】会員登録の認証コード",
    body: [
      "High Q バレーボールサークルの会員登録ありがとうございます。",
      "",
      "下記の 6 桁認証コードを画面に入力して、登録を完了してください。",
      "",
      `    ${code}`,
      "",
      "このコードは 30 分間有効です。",
      "",
      "もし心当たりがない場合は、このメールを破棄してください。",
      "（誰かがあなたのメールアドレスを誤って入力した可能性があります。会員登録は完了していません）",
      "",
      "----",
      "High Q バレーボールサークル",
      "https://high-q-reservation.onrender.com",
    ].join("\n"),
  };
}
