/**
 * Supabase クライアントの単一エントリポイント。
 *
 * - 各アプリは本ファイル（or 薄い app-local wrapper）経由でのみ Supabase へ接続する。
 * - 接続情報は環境変数（`VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY`）から取得。
 *   秘密情報を Claude / コードへ直接埋め込むことを禁止。
 * - `secret` key（旧 service_role）はサーバー専用のため本クライアントでは扱わない。
 *
 * 関連:
 *   openspec/changes/supabase-initial-schema/specs/supabase-foundation/spec.md
 *   CLAUDE.md セキュリティルール
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { type Result, ok, err, appError } from "../types/result.js";

/**
 * 各アプリの Vite ビルド時に注入される env 変数の型。
 * `import.meta.env` は Vite が型を提供するが、共有パッケージ単体では未定義のため
 * 部分的に宣言する。
 */
type ViteEnv = {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
};

export type SupabaseConnectionConfig = {
  url: string;
  publishableKey: string;
};

/**
 * 環境変数から接続情報を読み取り、形式バリデーションを通す。
 * 失敗時は明示的な AppError コードで返す。
 *
 * 期待する変数:
 *   - VITE_SUPABASE_URL: `https://<ref>.supabase.co` 形式
 *   - VITE_SUPABASE_PUBLISHABLE_KEY: `sb_publishable_...` で始まる新形式キー
 */
export function readSupabaseConfig(
  env: ViteEnv = (import.meta as unknown as { env: ViteEnv }).env
): Result<SupabaseConnectionConfig> {
  const url = env.VITE_SUPABASE_URL;
  const publishableKey = env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!url) {
    return err(
      appError(
        "ENV_MISSING_SUPABASE_URL",
        "VITE_SUPABASE_URL is not set. Copy apps/<app>/.env.example to .env.local and fill in the value from Supabase Dashboard → Settings → API."
      )
    );
  }
  if (!publishableKey) {
    return err(
      appError(
        "ENV_MISSING_SUPABASE_PUBLISHABLE_KEY",
        "VITE_SUPABASE_PUBLISHABLE_KEY is not set. Copy apps/<app>/.env.example to .env.local and fill in the value from Supabase Dashboard → Settings → API Keys (Publishable and secret tab)."
      )
    );
  }
  // `*.supabase.co` (本番) または `*.invalid` (RFC 2606 予約 TLD、E2E テスト専用) を許可。
  // E2E では DNS 解決できない `.invalid` を使うことで本番 Supabase へ届かないことを保証する。
  // 関連: openspec/changes/admin-login-magic-link/design.md (D10.1)
  if (!/^https:\/\/[a-z0-9-]+\.(supabase\.co|invalid)$/i.test(url)) {
    return err(
      appError(
        "ENV_INVALID_SUPABASE_URL",
        `VITE_SUPABASE_URL must look like 'https://<ref>.supabase.co' (or '<name>.invalid' for E2E), got: ${url}`
      )
    );
  }
  return ok({ url, publishableKey });
}

/**
 * Supabase クライアントを生成する。
 * 各アプリ起動時に 1 度だけ呼び出して使い回す想定。
 *
 * 内部で `readSupabaseConfig()` を呼び、env が不正なら AppError を投げる。
 * 例外を投げる挙動はアプリ起動時 fail-fast の方針（後で `Result` を呼び出し側で
 * 受け取りたいなら `createSupabaseClientSafe` を使う）。
 */
export function createSupabaseClient(
  env?: ViteEnv
): SupabaseClient {
  const result = createSupabaseClientSafe(env);
  if (!result.ok) {
    throw new Error(`[supabase] ${result.error.code}: ${result.error.message}`);
  }
  return result.value;
}

/**
 * Result を返す版（テスト容易性のため）。
 */
export function createSupabaseClientSafe(
  env?: ViteEnv
): Result<SupabaseClient> {
  const cfg = env === undefined ? readSupabaseConfig() : readSupabaseConfig(env);
  if (!cfg.ok) {
    return cfg;
  }
  const client = createClient(cfg.value.url, cfg.value.publishableKey, {
    auth: {
      // クライアント側で session を localStorage に永続化（Vite/Vue の標準動作）
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return ok(client);
}
