import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { EventAvailability } from '../model/event.types'

interface RpcResult {
  data: unknown
  error: unknown
}

const rpcResult: RpcResult = {
  data: null,
  error: null,
}

const rpcMock = vi.fn(async () => ({
  data:  rpcResult.data,
  error: rpcResult.error,
}))
const supabaseClient = { rpc: rpcMock }

vi.mock('@shared/api', () => ({
  getSupabase: () => supabaseClient,
}))

beforeEach(() => {
  vi.clearAllMocks()
  rpcResult.data = null
  rpcResult.error = null
})

type AvailabilityQueryFn = () => Promise<Map<string, EventAvailability>>

describe('availabilityQueryOptions.byIds()', () => {
  it('Success: event_id をキーに capacity / reservedCount のマップを返す', async () => {
    rpcResult.data = [
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
    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('Error: 失敗時は throw せず空マップを返す (残席は非クリティカル・graceful)', async () => {
    rpcResult.error = { message: 'permission denied' }
    const { availabilityQueryOptions } = await import('./availabilityQueries')

    const map = await (availabilityQueryOptions.byIds(['evt-1']).queryFn as AvailabilityQueryFn)()

    expect(map.size).toBe(0)
  })

  it('Query: get_event_availability を p_event_ids でRPC呼び出しする', async () => {
    rpcResult.data = []
    const { availabilityQueryOptions } = await import('./availabilityQueries')

    await (availabilityQueryOptions.byIds(['evt-1', 'evt-2']).queryFn as AvailabilityQueryFn)()

    expect(rpcMock).toHaveBeenCalledWith('get_event_availability', {
      p_event_ids: ['evt-1', 'evt-2'],
    })
  })
})
