import { expect, test } from "@playwright/test";
import { installSupabaseGuard } from "./_helpers/supabaseGuard";

/**
 * #153 admin イベント複製の E2E (Playwright)。
 *
 * 関連:
 *   openspec/changes/admin-event-duplicate/specs/admin-event-duplicate/spec.md
 *   openspec/changes/admin-event-duplicate/design.md (D1, D5)
 *
 * CLAUDE.md / 既存 events-crud.e2e.ts の方針「機能あたり 1〜2 件、ハッピーパスは
 * component test に押し下げる」に従い、本 E2E は複製導線が admin auth guard 配下に
 * あることだけを End-to-End で確認する。複製のハッピーパス（一覧の複製リンク →
 * 会場・時間・参加費の引き継ぎ → 開催日空 → 保存 → 一覧追加 / 複製元不変）は
 * component test で網羅済み:
 *   - duplicateSeed.spec.ts: seedFromEvent / resolveDuplicateName の純関数挙動
 *   - EventCreatePage.spec.ts: ?from 取得成功でシード + 手がかり / 取得失敗でフォールバック
 *   - EventsTable.spec.ts: 複製リンクの href (/events/new?from=:id) / aria-label / z-10
 * これらを Playwright で再走させる価値は、AAL2 + admin role + MFA factor の認証
 * 再現コストに見合わない。
 */

test.describe("admin event duplicate — auth guard", () => {
  test.beforeEach(async ({ page }) => {
    await installSupabaseGuard(page);
  });

  test("未認証で複製先 /events/new?from=<id> にアクセスすると /login にリダイレクトされる", async ({
    page,
  }) => {
    await page.goto(
      "/events/new?from=11111111-1111-4111-8111-111111111111",
    );
    await expect(page).toHaveURL(/\/login(\?.*)?$/);
    await expect(page.locator("input[type=email]")).toBeVisible();
  });
});
