#!/usr/bin/env node
// =============================================================================
// dev-login.mjs — dev 環境のメール送信なしパスワードレスログイン (#339)
// =============================================================================
// 目的:
//   Supabase 組み込みメールの送信回数制限により dev でマジックリンクメールが
//   詰まる問題を回避する。service_role で `auth.admin.generateLink` を叩き、
//   メール送信ゼロ回でログイン用 action_link を生成する。
//
// 使い方:
//   SUPABASE_URL=https://<ref>.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=<dev project service_role key> \
//   node scripts/dev/dev-login.mjs --app reservation
//
//   # admin を wt-247 ポートで:
//   node scripts/dev/dev-login.mjs --app admin --port 5273
//
//   # 別の会員メールで reservation を試す:
//   node scripts/dev/dev-login.mjs --app reservation --email member@example.com
//
// 引数:
//   --app <admin|reservation>   必須。callback / デフォルトポートを切り替える
//   --email <addr>              省略時は owner (high.q.volleyball@gmail.com)
//   --port <n>                  省略時は admin=5173 / reservation=5174 (メイン worktree)
//                               worktree のポート: 5173/5174 (main) / 5273/5274 (wt-247)
//
// 環境変数 (必須・実行時に渡す。.env は読まない):
//   SUPABASE_URL                dev プロジェクトの URL
//   SUPABASE_SERVICE_ROLE_KEY   dev プロジェクトの service_role キー
//
// セキュリティ:
//   - service_role はこの Node スクリプト (サーバーサイド相当) でのみ使用。
//     クライアント (apps/*) には絶対に置かない (CLAUDE.md Pillar 4 / セキュリティルール)。
//   - キーは引数ではなく環境変数で渡し、シェル履歴・プロセス一覧に残りにくくする。
//
// 前提:
//   - 出力された action_link の redirect_to (http://localhost:<port>/auth/callback) が
//     dev Supabase の Authentication > URL Configuration > Redirect URLs に登録済みで
//     あること。未登録のポートは Supabase 側で弾かれる。
//   - admin: 生成リンクで AAL1 まで。続けて authenticator アプリの MFA 6 桁入力が要る。
//   - reservation: MFA 無し。リンクを開けば完全ログイン。
// =============================================================================

import { createClient } from "@supabase/supabase-js";

const OWNER_EMAIL = "high.q.volleyball@gmail.com";

const APP_CONFIG = {
  admin: { defaultPort: 5173, mfa: true },
  reservation: { defaultPort: 5174, mfa: false },
};

function parseArgs(argv) {
  const args = { app: null, email: null, port: null };
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    const next = argv[i + 1];
    if (key === "--app") {
      args.app = next;
      i += 1;
    } else if (key === "--email") {
      args.email = next;
      i += 1;
    } else if (key === "--port") {
      args.port = next;
      i += 1;
    } else if (key === "-h" || key === "--help") {
      args.help = true;
    }
  }
  return args;
}

function printUsageAndExit(code) {
  const lines = [
    "Usage: node scripts/dev/dev-login.mjs --app <admin|reservation> [--email <addr>] [--port <n>]",
    "",
    "必須環境変数:",
    "  SUPABASE_URL                dev プロジェクトの URL (例: https://xxxx.supabase.co)",
    "  SUPABASE_SERVICE_ROLE_KEY   dev プロジェクトの service_role キー",
    "",
    "例:",
    "  SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \\",
    "    node scripts/dev/dev-login.mjs --app reservation",
    "  node scripts/dev/dev-login.mjs --app admin --port 5273",
  ];
  // eslint-disable-next-line no-console
  console.log(lines.join("\n"));
  process.exit(code);
}

function fail(message) {
  // eslint-disable-next-line no-console
  console.error(`\n[dev-login] エラー: ${message}\n`);
  process.exit(1);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) printUsageAndExit(0);

  if (!args.app || !APP_CONFIG[args.app]) {
    fail("--app は admin か reservation を指定してください。");
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    fail(
      "SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を環境変数で渡してください。\n" +
        "  例: SUPABASE_URL=https://xxxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=eyJ... \\\n" +
        "        node scripts/dev/dev-login.mjs --app " +
        args.app,
    );
  }

  const config = APP_CONFIG[args.app];
  const email = args.email || OWNER_EMAIL;
  const port = args.port ? Number(args.port) : config.defaultPort;

  if (!Number.isInteger(port) || port <= 0) {
    fail(`--port の値が不正です: ${args.port}`);
  }

  const origin = `http://localhost:${port}`;
  const redirectTo = `${origin}/auth/callback`;

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo },
  });

  if (error) {
    fail(`generateLink 失敗: ${error.message}`);
  }

  const actionLink = data?.properties?.action_link;
  if (!actionLink) {
    fail("action_link が取得できませんでした (レスポンス形式を確認してください)。");
  }

  // eslint-disable-next-line no-console
  console.log(
    [
      "",
      `[dev-login] ${args.app} 用ログインリンクを生成しました (メール送信なし)`,
      `  email:       ${email}`,
      `  redirect_to: ${redirectTo}`,
      "",
      "▼ 以下をブラウザで開いてください:",
      "",
      actionLink,
      "",
      config.mfa
        ? "※ admin は AAL1 までです。リンクを開いた後 authenticator アプリの MFA 6 桁を入力してください。"
        : "※ reservation は MFA 無し。リンクを開けば完全ログインです。",
      "※ 弾かれる場合は redirect_to が dev Supabase の Redirect URLs に登録済みか確認してください。",
      "",
    ].join("\n"),
  );
}

main().catch((e) => {
  fail(e instanceof Error ? e.message : String(e));
});
