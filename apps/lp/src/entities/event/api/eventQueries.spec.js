import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { eventQueryOptions } from './eventQueries'

const mockEvents = [
  { id: '1', title: 'バレー会', start_time: '2026-05-01T09:00:00', end_time: '2026-05-01T11:00:00', location: '体育館A' },
]

describe('eventQueryOptions', () => {
  beforeEach(() => {
    global.fetch = vi.fn()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('正常データを取得してEventオブジェクトの配列を返す', async () => {
    global.fetch.mockResolvedValue({
      ok:   true,
      json: async () => ({ body: JSON.stringify(mockEvents) }),
    })

    const result = await eventQueryOptions.list().queryFn()

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      id:       '1',
      name:     'バレー会',
      location: '体育館A',
    })
    expect(result[0].start).toBeInstanceOf(Date)
    expect(result[0].end).toBeInstanceOf(Date)
  })

  it('HTTPエラー時に例外を投げる', async () => {
    global.fetch.mockResolvedValue({ ok: false, status: 500 })

    await expect(eventQueryOptions.list().queryFn()).rejects.toThrow('HTTP 500')
  })
})
