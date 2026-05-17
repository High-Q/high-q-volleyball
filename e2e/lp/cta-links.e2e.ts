import { expect, test } from '@playwright/test'
import { mockEventApi } from './_helpers/eventApi'

test.describe('LP CTA リンク先', () => {
  test('Hero CTA は #event-list-heading へアンカー遷移する', async ({ page }) => {
    await mockEventApi(page, [])
    await page.goto('/')

    const hero = page.getByTestId('hero-event-list-cta')
    await expect(hero).toBeVisible()
    await expect(hero).toHaveAttribute('href', '#event-list-heading')
  })

  test('Final CTA primary は LINE オープンチャットを target=_blank で開く', async ({ page }) => {
    await mockEventApi(page, [])
    await page.goto('/')

    const line = page.getByTestId('final-cta-line')
    await expect(line).toBeAttached()
    const href = await line.getAttribute('href')
    expect(href).toMatch(/^https:\/\/line\.me\/ti\/g2\//)
    await expect(line).toHaveAttribute('target', '_blank')
    await expect(line).toHaveAttribute('rel', 'noopener noreferrer')
  })

  test('Final CTA secondary は #event-list-heading へアンカー遷移する', async ({ page }) => {
    await mockEventApi(page, [])
    await page.goto('/')

    const second = page.getByTestId('final-cta-event-list')
    await expect(second).toBeAttached()
    await expect(second).toHaveAttribute('href', '#event-list-heading')
  })

  test('Final CTA に旧 X DM ボタンと予約サイト直行ボタンが存在しない', async ({ page }) => {
    await mockEventApi(page, [])
    await page.goto('/')

    // X DM ボタンが撤去されている
    await expect(page.getByTestId('final-cta-x')).toHaveCount(0)

    // Final CTA セクション内に reservation URL を直接 href に持つ <a> が無い
    const reservationUrl = process.env.VITE_RESERVATION_URL ?? 'http://localhost:4175'
    const finalCta = page.locator('section[aria-labelledby="final-cta-heading"]')
    const directReservationLinks = finalCta.locator(`a[href^="${reservationUrl}"]`)
    await expect(directReservationLinks).toHaveCount(0)
  })

  test('next-session 帯は予約 URL へ直行する（LINE fallback しない）', async ({ page }) => {
    const startIso = new Date(Date.now() + 86_400_000).toISOString()
    const endIso = new Date(Date.now() + 86_400_000 + 7_200_000).toISOString()
    await mockEventApi(page, [
      {
        id: 'evt-next-001',
        title: '次回練習',
        start_time: startIso,
        end_time: endIso,
        location: '江東区スポーツセンター',
      },
    ])
    await page.goto('/')

    const cta = page.getByTestId('next-session-cta')
    await expect(cta).toBeVisible()
    const href = await cta.getAttribute('href')
    // 予約 URL は base + /events/<id>。LINE オープンチャットへ fallback していない
    expect(href).not.toMatch(/^https:\/\/line\.me\//)
    expect(href).toMatch(/\/events\/evt-next-001$/)
  })
})
