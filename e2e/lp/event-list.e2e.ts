import { expect, test } from '@playwright/test'
import { mockEventApi, type EventFixture } from './_helpers/eventApi'

/**
 * LP の新デザイン (#160) において:
 * - NextSessionStrip と EventList の予約導線が reservation の `/events/<id>` に
 *   イベント識別子を path 付きで遷移させること
 * - 取得結果が 0 件のときは EventList が「予定されている開催はありません」を表示すること
 *
 * NextSessionStrip / EventList のデータ源は Supabase events テーブル（Issue #228）。
 * E2E では mockEventApi で PostgREST レスポンスを横取りする。
 */

const happyFixtures: EventFixture[] = [
  {
    id: 'evt-001',
    title: 'ゆる練 vol.21',
    start_time: '2026-05-16T18:00:00+09:00',
    end_time: '2026-05-16T20:00:00+09:00',
    location: '江東区スポーツ会館',
  },
  {
    id: 'evt-002',
    title: 'ゆる練 vol.22',
    start_time: '2026-05-23T13:00:00+09:00',
    end_time: '2026-05-23T15:00:00+09:00',
    location: '豊洲文化センター',
  },
]

test.describe('LP EventList & NextSessionStrip', () => {
  test('イベントカードに reservation `/events/<id>` の URL が設定される', async ({ page }) => {
    await mockEventApi(page, happyFixtures)
    await page.goto('/')

    const list = page.getByTestId('event-list')
    await expect(list).toBeVisible()

    // 1 枚目のカードの予約 URL は reservation 側 /events/evt-001 で終わる
    const firstCard = list.locator('.event-card').first()
    await expect(firstCard).toBeVisible()
    const href = await firstCard.getAttribute('href')
    expect(href).toBeTruthy()
    expect(href!).toMatch(/\/events\/evt-001$/)

    // 次回開催帯のリンクも /events/evt-001 を指す
    const nextLink = page.getByTestId('next-session-strip-link')
    await expect(nextLink).toBeVisible()
    const nextHref = await nextLink.getAttribute('href')
    expect(nextHref!).toMatch(/\/events\/evt-001$/)
  })

  test('開催が 0 件のとき EventList は Empty 文言を表示する', async ({ page }) => {
    await mockEventApi(page, [])
    await page.goto('/')

    const list = page.getByTestId('event-list')
    await expect(list).toBeVisible()
    await expect(
      list.getByText('現在、予定されている開催はありません', { exact: false }),
    ).toBeVisible()
  })
})
