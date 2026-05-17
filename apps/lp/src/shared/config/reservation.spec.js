import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

// reservation.js は module top-level で import.meta.env を読み込むため、
// 各ケースで vi.resetModules() + vi.stubEnv() を組み合わせて再評価する。

describe('shared/config/reservation', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('VITE_RESERVATION_URL 未設定時は本番予約サイトに fallback する', async () => {
    vi.stubEnv('VITE_RESERVATION_URL', '')
    const { reservationBaseUrl, reservationEventUrl, reservationTopUrl } =
      await import('./reservation.js')
    expect(reservationBaseUrl()).toBe('https://high-q-reservation.onrender.com')
    expect(reservationTopUrl()).toBe('https://high-q-reservation.onrender.com')
    expect(reservationEventUrl('evt-123')).toBe(
      'https://high-q-reservation.onrender.com/events/evt-123'
    )
  })

  it('VITE_RESERVATION_URL が設定されていればそれを優先し、末尾スラッシュは除去する', async () => {
    vi.stubEnv('VITE_RESERVATION_URL', 'https://reservation.example.com//')
    const { reservationBaseUrl, reservationEventUrl } = await import('./reservation.js')
    expect(reservationBaseUrl()).toBe('https://reservation.example.com')
    expect(reservationEventUrl('evt-1')).toBe(
      'https://reservation.example.com/events/evt-1'
    )
  })

  it('reservationEventUrl は eventId が空なら空文字を返す', async () => {
    vi.stubEnv('VITE_RESERVATION_URL', 'https://reservation.example.com')
    const { reservationEventUrl } = await import('./reservation.js')
    expect(reservationEventUrl('')).toBe('')
    expect(reservationEventUrl(undefined)).toBe('')
  })

  it('reservationEventUrl は eventId を URL エンコードする', async () => {
    vi.stubEnv('VITE_RESERVATION_URL', 'https://reservation.example.com')
    const { reservationEventUrl } = await import('./reservation.js')
    expect(reservationEventUrl('a/b c')).toBe(
      'https://reservation.example.com/events/a%2Fb%20c'
    )
  })
})
