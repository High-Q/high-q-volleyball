import { expect, test } from "@playwright/test";
import { installSupabaseGuard } from "./_helpers/supabaseGuard";

/**
 * #171 admin 本人確認書類レビュー画面の E2E (Playwright)。
 *
 * 関連:
 *   openspec/changes/admin-identity-document-review/specs/admin-identity-document-review/spec.md
 *   openspec/changes/admin-identity-document-review/design.md (D14)
 *
 * E2E は CLAUDE.md ルール「機能あたり 1〜2 件まで、肥大化したら component test
 * に押し下げる」に従い 1 件に絞る。理由:
 *
 *   - 認証済 admin の AAL2 セッション再現 + Storage signed URL mock + DB seed が
 *     必要で、認証 / fixture セットアップだけで E2E が肥大する
 *   - 一覧 / 詳細 / 各 mutation / 連鎖予約キャンセル / mailto: / 二重承認防御は
 *     既に component / composable test (admin 690 spec) で網羅済:
 *       - widgets/identity-documents-list/ (UI 4 状態) — 統合 widget 動作
 *       - widgets/identity-document-detail/ (画像プレビュー / Dialog ズーム / アクション)
 *       - features/identity-document-{approve,reject,mask-delete}/ (mutation 4 段階分岐)
 *       - features/identity-documents-filter/ (URL 同期 23 spec)
 *       - features/identity-document-pending-badge/ (composable 7 + Badge 5)
 *       - entities/identity-document/api/ (queries 19 + getSignedUrl 5)
 *
 * 本 E2E では「auth guard が /identity-documents を保護していること」のみを確認する。
 */

test.describe("admin identity document review", () => {
  test.beforeEach(async ({ page }) => {
    await installSupabaseGuard(page);
  });

  test("未認証で /identity-documents にアクセスすると /login にリダイレクトされる", async ({
    page,
  }) => {
    await page.goto("/identity-documents");
    await expect(page).toHaveURL(/\/login(\?.*)?$/);
    await expect(page.locator("input[type=email]")).toBeVisible();
  });

  test("未認証で /identity-documents/:id にアクセスすると /login にリダイレクトされる", async ({
    page,
  }) => {
    await page.goto("/identity-documents/00000000-0000-0000-0000-000000000001");
    await expect(page).toHaveURL(/\/login(\?.*)?$/);
  });
});
