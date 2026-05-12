import type { Page } from '@playwright/test'

/**
 * LP の E2E で使う Supabase events 取得モック。
 *
 * #228 以降 LP のイベント取得は Supabase 経由になったため、PostgREST 形式
 * (`/rest/v1/events?...`) を route で横取りし、配列を直接返す。
 * fixture shape は旧 AWS API のものを維持（テスト側の参照プロパティを
 * 変えないため）し、本ヘルパー内部で Supabase レスポンス shape へ変換する:
 *
 *   title       → name
 *   start_time  → start_at
 *   end_time    → end_at
 *   location    → venues.name
 */

import type { Route } from '@playwright/test'

export type EventFixture = {
  id: string | number
  title: string
  start_time: string
  end_time: string
  location: string
}

function toSupabaseRow(e: EventFixture) {
  return {
    id: e.id,
    name: e.title,
    start_at: e.start_time,
    end_at: e.end_time,
    venues: { name: e.location },
  }
}

export async function mockEventApi(page: Page, events: EventFixture[]): Promise<void> {
  await page.route(/\/rest\/v[0-9]+\/events/, async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(events.map(toSupabaseRow)),
    })
  })
}
