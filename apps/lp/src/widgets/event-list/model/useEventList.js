import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { eventQueryOptions } from '@entities/event'

const MONTH_EN = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
const DOW_EN = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

function pad(n) {
  return String(n).padStart(2, '0')
}

function formatTime(d) {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return ''
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function formatRange(start, end) {
  const a = formatTime(start)
  const b = formatTime(end)
  if (a && b) return `${a}–${b}`
  return a || b
}

export function useEventList() {
  const { data, isPending, isError } = useQuery(eventQueryOptions.list())

  const events = computed(() =>
    (data.value ?? []).map((e) => {
      const start = e.start instanceof Date ? e.start : new Date(e.start)
      return {
        id: e.id,
        title: e.name,
        location: e.location ?? '',
        time: formatRange(start, e.end),
        monthLabel: MONTH_EN[start.getMonth()] ?? '',
        dayLabel: pad(start.getDate()),
        dowLabel: DOW_EN[start.getDay()] ?? '',
      }
    }),
  )

  const isEmpty = computed(
    () => !isPending.value && !isError.value && events.value.length === 0,
  )

  return { events, isPending, isError, isEmpty }
}
