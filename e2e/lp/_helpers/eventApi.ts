import type { Page } from '@playwright/test'

export type EventFixture = {
  id: string | number
  title: string
  start_time: string
  end_time: string
  location: string
}

export async function mockEventApi(page: Page, events: EventFixture[]): Promise<void> {
  await page.route('**/beta/event', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ body: JSON.stringify(events) }),
    })
  })
}
