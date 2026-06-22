import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { EventAvailability } from '../model/event.types'

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
    in:     vi.fn().mockImplementation(async () => ({
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

type AvailabilityQueryFn = () => Promise<Map<string, EventAvailability>>

describe('availabilityQueryOptions.byIds()', () => {
  it('Success: event_id をキーに capacity / reservedCount のマップを返す', async () => {
    builderResult.data = [
      { event_id: 'evt-1', capacity: 12, reserved_count: 9 },
      { event_id: 'evt-2', capacity: null, reserved_count: 4 },
    ]
    const { availabilityQueryOptions } = await import('./availabilityQueries')

    const map = await (availabilityQueryOptions.byIds(['evt-1', 'evt-2']).queryFn as AvailabilityQueryFn)()

    expect(map.get('evt-1')).toEqual({ eventId: 'evt-1', capacity: 12, reservedCount: 9 })
    expect(map.get('evt-2')).toEqual({ eventId: 'evt-2', capacity: null, reservedCount: 4 })
  })

  it('Empty: ids が空のときクエリせず空マップを返す', async () => {
    const { availabilityQueryOptions } = await import('./availabilityQueries')

    const map = await (availabilityQueryOptions.byIds([]).queryFn as AvailabilityQueryFn)()

    expect(map.size).toBe(0)
    expect(fromMock).not.toHaveBeenCalled()
  })

  it('Error: Supabase が error を返すと throw する', async () => {
    builderResult.error = { message: 'permission denied' }
    const { availabilityQueryOptions } = await import('./availabilityQueries')

    await expect(
      (availabilityQueryOptions.byIds(['evt-1']).queryFn as AvailabilityQueryFn)(),
    ).rejects.toThrow('permission denied')
  })

  it('Query: event_availability_view を集計3列のみで select / in(event_id, ids) を発行する', async () => {
    builderResult.data = []
    const { availabilityQueryOptions } = await import('./availabilityQueries')

    await (availabilityQueryOptions.byIds(['evt-1', 'evt-2']).queryFn as AvailabilityQueryFn)()

    expect(fromMock).toHaveBeenCalledWith('event_availability_view')

    expect(currentBuilder.select).toHaveBeenCalledTimes(1)
    const selectArg = currentBuilder.select.mock.calls[0]![0] as string
    expect(selectArg).toBe('event_id, capacity, reserved_count')

    expect(currentBuilder.in).toHaveBeenCalledWith('event_id', ['evt-1', 'evt-2'])
  })
})
