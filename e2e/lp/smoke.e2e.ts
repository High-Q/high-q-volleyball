import { expect, test } from '@playwright/test'

test.describe('LP smoke @smoke', () => {
  test('トップページが描画され主要セクションとカレンダー widget root が存在する', async ({ page }) => {
    await page.goto('/')

    // 1. <title> がブランド名を含む
    await expect(page).toHaveTitle(/High Q/i)

    // 2. Hero セクション: ブランドタイトルが visible
    // [TEMP] 4.5 verification: artifact upload on failure
    await expect(page.locator('.hero-title-DELIBERATELY-BROKEN')).toBeVisible()

    // 3. Concept セクション (#concept) が DOM に存在する
    await expect(page.locator('section#concept')).toBeAttached()

    // 4. Activities セクション (#activities) が DOM に存在する
    await expect(page.locator('section#activities')).toBeAttached()

    // 5. Event セクション (#event) が DOM に存在する（カレンダーの外側）
    await expect(page.locator('section#event')).toBeAttached()

    // 6. カレンダー widget root が DOM に存在する
    //    （データの有無は問わない、widget が壊滅していないことのみ検出）
    await expect(page.locator('[data-testid="event-calendar"]')).toBeAttached()

    // 7. Footer が visible（contentinfo role を持つ <footer> 要素）
    await expect(page.getByRole('contentinfo')).toBeVisible()
  })
})
