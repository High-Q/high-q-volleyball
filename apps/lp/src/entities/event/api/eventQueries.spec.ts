import { beforeEach, describe, expect, it, vi } from 'vitest'

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
    eq:     vi.fn().mockReturnThis(),
    gte:    vi.fn().mockReturnThis(),
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

describe('eventQueryOptions.list()', () => {
  it('Success: published 未来イベントを Event オブジェクト配列で返す', async () => {
    builderResult.data = [
      {
        id:       'evt-1',
        name:     'バレー会',
        start_at: '2026-06-01T09:00:00+09:00',
        end_at:   '2026-06-01T11:00:00+09:00',
        vol:      74,
        venues:   { name: '体育館A' },
      },
    ]
    const { eventQueryOptions } = await import('./eventQueries')

    const result = await (eventQueryOptions.list().queryFn as () => Promise<Array<{ id: string; name: string; location: string; start: Date; end: Date; vol: number | null }>>)()

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      id:       'evt-1',
      name:     'バレー会',
      location: '体育館A',
      vol:      74,
    })
    expect(result[0]!.start).toBeInstanceOf(Date)
    expect(result[0]!.end).toBeInstanceOf(Date)
  })

  it('Empty: 0 件のとき空配列を返す', async () => {
    builderResult.data = []
    const { eventQueryOptions } = await import('./eventQueries')

    const result = await (eventQueryOptions.list().queryFn as () => Promise<unknown>)()

    expect(result).toEqual([])
  })

  it('Error: Supabase が error を返すと throw する', async () => {
    builderResult.error = { message: 'internal error' }
    const { eventQueryOptions } = await import('./eventQueries')

    await expect((eventQueryOptions.list().queryFn as () => Promise<unknown>)()).rejects.toThrow('internal error')
  })

  it('Query: events を select / visibility=published / start_at>=now / order=start_at.asc / venues join を発行する', async () => {
    builderResult.data = []
    const { eventQueryOptions } = await import('./eventQueries')

    await (eventQueryOptions.list().queryFn as () => Promise<unknown>)()

    expect(fromMock).toHaveBeenCalledWith('events')

    expect(currentBuilder.select).toHaveBeenCalledTimes(1)
    const selectArg = currentBuilder.select.mock.calls[0]![0]
    expect(selectArg).toContain('id')
    expect(selectArg).toContain('name')
    expect(selectArg).toContain('start_at')
    expect(selectArg).toContain('end_at')
    expect(selectArg).toContain('vol')
    expect(selectArg).toMatch(/venues.*name/)

    expect(currentBuilder.eq).toHaveBeenCalledWith('visibility', 'published')

    expect(currentBuilder.gte).toHaveBeenCalledTimes(1)
    const [gteCol, gteVal] = currentBuilder.gte.mock.calls[0]!
    expect(gteCol).toBe('start_at')
    expect(gteVal).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)

    expect(currentBuilder.order).toHaveBeenCalledWith('start_at', { ascending: true })
  })
})
