import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'

vi.mock('@tanstack/vue-query', () => ({
  useQuery: vi.fn(),
}))
vi.mock('@entities/event', () => ({
  eventQueryOptions: { list: () => ({ queryKey: ['events'], queryFn: vi.fn() }) },
}))

import { useQuery } from '@tanstack/vue-query'
import { useEventCalendar } from './useEventCalendar'

const mockEvent = {
  id: '1', name: 'バレー会',
  start: new Date('2026-05-01T09:00:00'),
  end:   new Date('2026-05-01T11:00:00'),
  location: '体育館A',
}

describe('useEventCalendar', () => {
  it('Loading状態: isPending=trueのとき calendarEvents は空・isEmpty=false', () => {
    useQuery.mockReturnValue({ data: ref(undefined), isPending: ref(true), isError: ref(false) })
    const { calendarEvents, isPending, isEmpty } = useEventCalendar()
    expect(isPending.value).toBe(true)
    expect(calendarEvents.value).toEqual([])
    expect(isEmpty.value).toBe(false)
  })

  it('Error状態: isError=trueのとき isError が伝播する', () => {
    useQuery.mockReturnValue({ data: ref(undefined), isPending: ref(false), isError: ref(true) })
    const { isError, isEmpty } = useEventCalendar()
    expect(isError.value).toBe(true)
    expect(isEmpty.value).toBe(false)
  })

  it('Empty状態: データが空配列のとき isEmpty=true', () => {
    useQuery.mockReturnValue({ data: ref([]), isPending: ref(false), isError: ref(false) })
    const { isEmpty, calendarEvents } = useEventCalendar()
    expect(isEmpty.value).toBe(true)
    expect(calendarEvents.value).toEqual([])
  })

  it('Success状態: データありのとき calendarEvents にマッピングされる', () => {
    useQuery.mockReturnValue({ data: ref([mockEvent]), isPending: ref(false), isError: ref(false) })
    const { calendarEvents, isEmpty } = useEventCalendar()
    expect(calendarEvents.value).toHaveLength(1)
    expect(calendarEvents.value[0]).toMatchObject({ name: 'バレー会', color: 'secondary', location: '体育館A' })
    expect(isEmpty.value).toBe(false)
  })
})
