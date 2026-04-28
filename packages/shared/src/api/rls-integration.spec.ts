/**
 * RLS 振る舞い統合テスト (Issue #147 / Section 5)
 *
 * 本テストは Supabase に対する **integration test** であり、デフォルトでは skip。
 * 環境変数 `RUN_SUPABASE_INTEGRATION=true` を立てた時のみ実行される。
 *
 * 必要な env:
 *   RUN_SUPABASE_INTEGRATION=true
 *   VITE_SUPABASE_URL=<test project url>
 *   VITE_SUPABASE_PUBLISHABLE_KEY=<anon key>
 *   SUPABASE_SERVICE_ROLE_KEY=<secret key>  (テストデータ準備用)
 *
 * MVP1 では SQL ベースの手動検証 (`supabase/tests/verify_rls.sql`) を一次的な
 * 検証手段とし、本ファイルは将来的な CI 統合のためのスタブ。
 *
 * 関連:
 *   - openspec/changes/db-schema-foundation/specs/rls-policies/spec.md
 *   - supabase/tests/verify_rls.sql (manual run)
 */

import { describe, it, expect } from "vitest";

const RUN_INTEGRATION = process.env.RUN_SUPABASE_INTEGRATION === "true";
const describeIntegration = RUN_INTEGRATION ? describe : describe.skip;

describeIntegration("RLS: venues (Section 5.1-5.3)", () => {
  it.todo(
    "5.1 anon ユーザーが SELECT すると 5 行 (seed 投入済) 返る"
  );

  it.todo("5.2 一般 member ロールが INSERT を試みると 0 行 INSERT で拒否される");

  it.todo("5.3 admin ロールが INSERT すると行が作成される");
});

describeIntegration("RLS: identity_documents (Section 5.4-5.7)", () => {
  it.todo("5.4 自分の member_id で SELECT すると自分の書類のみ返る");

  it.todo("5.5 他人の member_id を指定して SELECT すると 0 行 (RLS で除外)");

  it.todo(
    "5.6 自分の書類の status を 'approved' に UPDATE しようとすると拒否される"
  );

  it.todo("5.7 admin が任意の書類の status を 'approved' に UPDATE すると成功");
});

describeIntegration("RLS: Storage identity-documents bucket (Section 5.8-5.9)", () => {
  it.todo(
    "5.8 ログイン中の member が <auth.uid()>/<doc>.jpg にアップロードすると成功"
  );

  it.todo(
    "5.9 他人の <other_user_id>/<doc>.jpg にアップロードしようとすると拒否される"
  );
});

describeIntegration("Triggers / Constraints (Section 5.10-5.11)", () => {
  it.todo(
    "5.10 reservations.status を 'cancelled' に UPDATE すると cancelled_at が now() で自動セット"
  );

  it.todo(
    "5.11 同一 (event_id, member_id) で 2 件目の reservations を INSERT すると UNIQUE 違反"
  );
});

describe("Section 5 検証ガイド", () => {
  it("MVP1 の検証手段と将来計画を文書化", () => {
    // このテストは常に PASS。本ファイルの存在意義を文書化するためのプレースホルダー。
    expect(true).toBe(true);

    // 検証手順:
    //   1. supabase/tests/verify_rls.sql を Supabase Dashboard SQL Editor で RUN
    //   2. ✅ / ❌ で各テストの PASS/FAIL を確認
    //   3. 本 spec ファイルの it.todo を将来 it に置き換えて自動化
    //
    // CI 統合の前提:
    //   - test 用 Supabase プロジェクトの確保 (無料枠 1 つ追加)
    //   - GitHub Actions Secrets で URL / keys を設定
    //   - vitest 実行時に RUN_SUPABASE_INTEGRATION=true をセット
  });
});
