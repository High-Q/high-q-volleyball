import { expect, test } from '@playwright/test'
import { installSupabaseGuard } from './_helpers/supabaseGuard'

/**
 * #386 admin 告知テンプレートの E2E (Playwright)。
 *
 * 関連:
 *   openspec/changes/line-announcement-copy/specs/admin-announcement/spec.md
 *
 * 既存 admin E2E と同方針（認証済 admin の AAL2 セッション再現は肥大化するため
 * E2E 化しない）で、本 E2E では「auth guard が新ルート /announcement-template を
 * 保護していること」のみ確認する。編集・保存・プレビュー・告知文コピーは
 * component test に押し下げている:
 *   - apps/admin/src/features/announcement-template-edit/ui/AnnouncementTemplateForm.spec.ts
 *   - apps/admin/src/features/announcement-template-edit/composables/useAnnouncementTemplateForm.spec.ts
 *   - apps/admin/src/features/line-announcement/ui/AnnouncementDialog.spec.ts
 *   - apps/admin/src/widgets/event-detail/ui/EventDetailWidget.spec.ts (告知文をコピー CTA)
 *   - apps/admin/src/entities/announcement-template/lib/renderAnnouncement.spec.ts
 */

test.describe('admin announcement template', () => {
  test.beforeEach(async ({ page }) => {
    await installSupabaseGuard(page)
  })

  test('未認証で /announcement-template にアクセスすると /login にリダイレクトされる', async ({
    page,
  }) => {
    await page.goto('/announcement-template')
    await expect(page).toHaveURL(/\/login(\?.*)?$/)
    await expect(page.locator('input[type=email]')).toBeVisible()
  })
})
