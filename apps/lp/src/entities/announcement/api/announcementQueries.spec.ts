import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * 関連:
 *   openspec/changes/general-announcements/specs/lp-announcements/spec.md
 */

interface BuilderResult {
  data: unknown
  error: unknown
}

const builderResult: BuilderResult = {
  data: null,
  error: null,
}

function makeBuilder() {
  return {
    select: vi.fn().mockReturnThis(),
    in:     vi.fn().mockReturnThis(),
    order:  vi.fn().mockImplementation(async () => ({
      data:  builderResult.data,
      error: builderResult.error,
    })),
  }
}

let currentBuilder = makeBuilder()
const fromMock = vi.fn()
const supabaseClient = { from: fromMock }

vi.mock('@shared/api', () => ({
  getSupabase: () => supabaseClient,
}))

beforeEach(() => {
  vi.clearAllMocks()
  currentBuilder = makeBuilder()
  fromMock.mockReturnValue(currentBuilder)
  builderResult.data = null
  builderResult.error = null
})

describe('announcementQueryOptions.list()', () => {
  it('Success: 公開お知らせを camelCase 配列で返す', async () => {
    builderResult.data = [
      {
        id:            'ann-1',
        title:         'お知らせ',
        body:          '本文\n2行目',
        publish_start: '2026-11-18T00:00:00+09:00',
      },
    ]
    const { announcementQueryOptions } = await import('./announcementQueries')

    const result = await (announcementQueryOptions.list().queryFn as () => Promise<Array<{ id: string; title: string; body: string; publishStart: Date }>>)()

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ id: 'ann-1', title: 'お知らせ', body: '本文\n2行目' })
    expect(result[0]!.publishStart).toBeInstanceOf(Date)
  })

  it('Empty: 0 件のとき空配列を返す', async () => {
    builderResult.data = []
    const { announcementQueryOptions } = await import('./announcementQueries')

    const result = await (announcementQueryOptions.list().queryFn as () => Promise<unknown>)()

    expect(result).toEqual([])
  })

  it('Error: Supabase が error を返すと throw する', async () => {
    builderResult.error = { message: 'internal error' }
    const { announcementQueryOptions } = await import('./announcementQueries')

    await expect((announcementQueryOptions.list().queryFn as () => Promise<unknown>)()).rejects.toThrow('internal error')
  })

  it('Query: announcements を audience in (public,all) / order publish_start.desc で発行する', async () => {
    builderResult.data = []
    const { announcementQueryOptions } = await import('./announcementQueries')

    await (announcementQueryOptions.list().queryFn as () => Promise<unknown>)()

    expect(fromMock).toHaveBeenCalledWith('announcements')
    const selectArg = currentBuilder.select.mock.calls[0]![0]
    expect(selectArg).toContain('title')
    expect(selectArg).toContain('body')
    expect(currentBuilder.in).toHaveBeenCalledWith('audience', ['public', 'all'])
    expect(currentBuilder.order).toHaveBeenCalledWith('publish_start', { ascending: false })
  })
})
