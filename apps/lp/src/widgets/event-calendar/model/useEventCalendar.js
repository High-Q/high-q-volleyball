import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { eventQueryOptions } from '@entities/event'

export function useEventCalendar() {
  const { data, isPending, isError } = useQuery(eventQueryOptions.list())

  const calendarEvents = computed(() =>
    (data.value ?? []).map((e) => ({
      title:    e.name,
      name:     e.name,
      start:    e.start,
      end:      e.end,
      color:    'secondary',
      location: e.location,
    }))
  )

  const isEmpty = computed(() => !isPending.value && !isError.value && calendarEvents.value.length === 0)

  return { calendarEvents, isPending, isError, isEmpty }
}
