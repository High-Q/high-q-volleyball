import { createSupabaseClient } from "@high-q/shared/api";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * apps/admin 内の Supabase クライアント singleton。
 *
 * `@high-q/shared` の `createSupabaseClient` を 1 度だけ呼び出し、以降は
 * 同一インスタンスを返す。features/auth など下位レイヤーは本ファイル経由
 * でのみ Supabase へ接続する。
 *
 * 関連:
 *   openspec/changes/admin-login-magic-link/design.md (D9 配置)
 *   packages/shared/src/api/supabase.ts
 */

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (client === null) {
    client = createSupabaseClient();
  }
  return client;
}

/** テスト専用: 内部 singleton をリセットする。 */
export function _resetSupabaseForTest(): void {
  client = null;
}
