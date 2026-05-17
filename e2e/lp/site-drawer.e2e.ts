import { expect, test } from '@playwright/test'
import { mockEventApi } from './_helpers/eventApi'

test.describe('LP SiteHeader Drawer', () => {
  test('ハンバーガー押下で Drawer が開き、ナビリンクで対応セクションへ遷移して閉じる', async ({ page }) => {
    await mockEventApi(page, [])
    await page.goto('/')

    const hamburger = page.getByRole('button', { name: 'メニューを開く' })
    const drawer = page.locator('#site-drawer')

    await expect(hamburger).toBeVisible()
    await expect(drawer).toHaveAttribute('aria-hidden', 'true')

    await hamburger.click()
    await expect(drawer).toHaveAttribute('aria-hidden', 'false')
    await expect(drawer).toHaveClass(/site-drawer--open/)
    await expect(page.getByRole('button', { name: 'メニューを閉じる' })).toBeVisible()

    // body スクロールロックの確認
    await expect(page.locator('body')).toHaveClass(/is-locked/)

    // ナビリンク (event-list) を押下 → アンカー遷移 + Drawer 閉鎖
    await drawer.getByRole('link', { name: /開催スケジュール/ }).click()
    await expect(drawer).toHaveAttribute('aria-hidden', 'true')
    await expect(page.locator('body')).not.toHaveClass(/is-locked/)
    await expect(page).toHaveURL(/#event-list-heading$/)
  })

  test('Drawer footer の Primary CTA は LINE オープンチャットを target=_blank で開く', async ({ page }) => {
    await mockEventApi(page, [])
    await page.goto('/')

    await page.getByRole('button', { name: 'メニューを開く' }).click()

    const lineCta = page.getByTestId('drawer-cta-line')
    await expect(lineCta).toBeVisible()
    const href = await lineCta.getAttribute('href')
    expect(href).toMatch(/^https:\/\/line\.me\/ti\/g2\//)
    await expect(lineCta).toHaveAttribute('target', '_blank')
    await expect(lineCta).toHaveAttribute('rel', 'noopener noreferrer')
  })

  test('Drawer footer の Secondary CTA は #event-list-heading を指す', async ({ page }) => {
    await mockEventApi(page, [])
    await page.goto('/')

    await page.getByRole('button', { name: 'メニューを開く' }).click()

    const eventCta = page.getByTestId('drawer-cta-event-list')
    await expect(eventCta).toBeVisible()
    await expect(eventCta).toHaveAttribute('href', '#event-list-heading')
  })

  test('Esc キー押下で Drawer が閉じ、body lock も解除される', async ({ page }) => {
    await mockEventApi(page, [])
    await page.goto('/')

    const hamburger = page.getByRole('button', { name: 'メニューを開く' })
    const drawer = page.locator('#site-drawer')

    await hamburger.click()
    await expect(drawer).toHaveAttribute('aria-hidden', 'false')
    await expect(page.locator('body')).toHaveClass(/is-locked/)

    await page.keyboard.press('Escape')
    await expect(drawer).toHaveAttribute('aria-hidden', 'true')
    await expect(page.locator('body')).not.toHaveClass(/is-locked/)
  })
})
