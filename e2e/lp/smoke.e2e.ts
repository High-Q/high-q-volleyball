import { expect, test } from '@playwright/test'
import { mockEventApi } from './_helpers/eventApi'

test.describe('LP smoke @smoke', () => {
  test('トップページに新セクション群と footer が描画される', async ({ page }) => {
    await mockEventApi(page, [])
    await page.goto('/')

    await expect(page).toHaveTitle(/High Q/i)

    // ヒーロー（HeroFirst）の見出し
    await expect(page.locator('#hero-heading')).toBeVisible()

    // 各セクションの見出しが DOM に存在する
    await expect(page.locator('#reassurance-heading')).toBeAttached()
    await expect(page.locator('#about-heading')).toBeAttached()
    await expect(page.locator('#features-heading')).toBeAttached()
    await expect(page.locator('#flow-heading')).toBeAttached()
    await expect(page.locator('#worries-heading')).toBeAttached()
    await expect(page.locator('#event-list-heading')).toBeAttached()
    await expect(page.locator('#faq-heading')).toBeAttached()
    await expect(page.locator('#nfy-heading')).toBeAttached()
    await expect(page.locator('#gallery-heading')).toBeAttached()
    await expect(page.locator('#final-cta-heading')).toBeAttached()

    // EventList の widget root
    await expect(page.locator('[data-testid="event-list"]')).toBeAttached()

    // フッターは contentinfo role
    await expect(page.getByRole('contentinfo')).toBeVisible()
    await expect(page.getByTestId('footer-privacy-link')).toBeVisible()
    await expect(page.getByTestId('footer-external-transmission-link')).toBeVisible()
    await expect(page.getByTestId('footer-cookie-settings')).toBeVisible()
  })
})
