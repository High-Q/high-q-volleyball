import { expect, test } from "@playwright/test";
import { installSupabaseGuard } from "./_helpers/supabaseGuard";

/**
 * #86 admin events CRUD の E2E (Playwright)。
 *
 * 関連:
 *   openspec/changes/admin-events-crud-screen/specs/admin-events-crud/spec.md
 *   openspec/changes/admin-events-crud-screen/design.md (§7.4 E2E)
 *
 * CLAUDE.md ルール「機能あたり 1〜2 件まで、肥大化したら component test に押し
 * 下げる」に従い、auth guard の確認のみ E2E で行う。理由:
 *
 *   - happy path（新規作成 → 保存 → 公開中表示）と削除フローは、useEventForm /
 *     useEventDelete / EventForm / EventDeleteDialog / EventCreatePage /
 *     EventEditPage のいずれも component test (vitest) で網羅済み:
 *       - useEventForm.spec.ts: Create/Edit submit ペイロード検証 (visibility 固定 / capacity 入出力・下限バリデーション #343)
 *       - useEventDelete.spec.ts: confirm → deleteEvent → router.push('/events')
 *       - EventForm.spec.ts: mode 別アクション構成 / Banner / 削除 slot 反映
 *       - EventDeleteDialog.spec.ts: Open / Cancel / Confirm / Error
 *       - EventCreatePage.spec.ts / EventEditPage.spec.ts: 4 状態 + マウント検証
 *     これら 35 件を Playwright で再走させる価値は薄い。認証セットアップ（AAL2 +
 *     admin role + MFA factor）の再現コストに見合わない
 *   - 本 E2E では「新規作成 / 編集ルートが admin auth guard 配下にあること」だけ
 *     を End-to-End で確認する
 */

test.describe("admin events CRUD — auth guard", () => {
  test.beforeEach(async ({ page }) => {
    await installSupabaseGuard(page);
  });

  test("未認証で /events/new にアクセスすると /login にリダイレクトされる", async ({
    page,
  }) => {
    await page.goto("/events/new");
    await expect(page).toHaveURL(/\/login(\?.*)?$/);
    await expect(page.locator("input[type=email]")).toBeVisible();
  });

  test("未認証で /events/<id>/edit にアクセスすると /login にリダイレクトされる", async ({
    page,
  }) => {
    await page.goto(
      "/events/11111111-1111-4111-8111-111111111111/edit",
    );
    await expect(page).toHaveURL(/\/login(\?.*)?$/);
    await expect(page.locator("input[type=email]")).toBeVisible();
  });
});
