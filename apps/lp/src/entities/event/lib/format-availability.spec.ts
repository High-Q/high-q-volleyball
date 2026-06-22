import { describe, expect, it } from 'vitest'

import { formatAvailability } from './format-availability'

describe('formatAvailability', () => {
  it('募集中: 残り人数を「あと N 名 募集」で返す (80% 未満は ok トーン)', () => {
    const r = formatAvailability({ eventId: 'e', capacity: 12, reservedCount: 9 })
    expect(r).toEqual({ text: 'あと 3 名 募集', tone: 'ok', isFull: false })
  })

  it('募集中: 80% 以上は warn トーン', () => {
    const r = formatAvailability({ eventId: 'e', capacity: 10, reservedCount: 8 })
    expect(r).toEqual({ text: 'あと 2 名 募集', tone: 'warn', isFull: false })
  })

  it('満員: ちょうど定員に達したら「満員」/ isFull=true', () => {
    const r = formatAvailability({ eventId: 'e', capacity: 10, reservedCount: 10 })
    expect(r).toEqual({ text: '満員', tone: 'full', isFull: true })
  })

  it('満員: 定員超過でも「満員」', () => {
    const r = formatAvailability({ eventId: 'e', capacity: 10, reservedCount: 12 })
    expect(r).toEqual({ text: '満員', tone: 'full', isFull: true })
  })

  it('無制限: capacity=null は「N 名 予約中」', () => {
    const r = formatAvailability({ eventId: 'e', capacity: null, reservedCount: 4 })
    expect(r).toEqual({ text: '4 名 予約中', tone: 'ok', isFull: false })
  })

  it('取得失敗 (集計欠落): null を返しバッジを出さない', () => {
    expect(formatAvailability(null)).toBeNull()
    expect(formatAvailability(undefined)).toBeNull()
  })

  it('「席」表記は使わない', () => {
    const cases = [
      formatAvailability({ eventId: 'e', capacity: 12, reservedCount: 9 }),
      formatAvailability({ eventId: 'e', capacity: null, reservedCount: 4 }),
      formatAvailability({ eventId: 'e', capacity: 10, reservedCount: 10 }),
    ]
    for (const c of cases) {
      expect(c?.text).not.toContain('席')
    }
  })
})
