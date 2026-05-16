import { expect, test } from '@playwright/test'
import { mockEventApi, type EventFixture } from './_helpers/eventApi'

const FIXED_NOW = new Date('2026-05-15T10:00:00Z')

const happyFixtures: EventFixture[] = [
  {
    id: 'evt-001',
    title: '土曜練習会',
    start_time: '2026-05-16T18:00:00+09:00',
    end_time: '2026-05-16T21:00:00+09:00',
    location: '金町体育館',
  },
  {
    id: 'evt-002',
    title: '区民交流戦',
    start_time: '2026-05-23T13:00:00+09:00',
    end_time: '2026-05-23T17:00:00+09:00',
    location: '葛飾区総合スポーツセンター',
  },
]

test.describe('Event Calendar', () => {
  test('API が空配列を返すと Empty 文言が描画される', async ({ page }) => {
    await mockEventApi(page, [])

    await page.goto('/')

    const calendarRoot = page.locator('[data-testid="event-calendar"]')
    await expect(calendarRoot).toBeVisible()

    await expect(
      calendarRoot.getByText('予定されているイベントはありません'),
    ).toBeVisible()
  })

  test('イベントが描画され、クリックで詳細ダイアログが開く', async ({ page }) => {
    await page.clock.install({ time: FIXED_NOW })
    await mockEventApi(page, happyFixtures)

    await page.goto('/')

    const calendarRoot = page.locator('[data-testid="event-calendar"]')
    await expect(calendarRoot).toBeVisible()

    const firstEvent = calendarRoot.getByText(happyFixtures[0].title).first()
    await expect(firstEvent).toBeVisible()

    await firstEvent.click()

    const dialog = page.locator('.v-dialog').filter({ hasText: happyFixtures[0].title })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText(happyFixtures[0].location)).toBeVisible()
  })
})
