import { queryOptions } from '@tanstack/vue-query'

const API_URL = 'https://ptfomh71x9.execute-api.ap-northeast-1.amazonaws.com/beta/event'

async function fetchEvents() {
  const res = await fetch(API_URL)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = await res.json()
  const data = JSON.parse(json.body)
  return data.map((e) => ({
    id:       e.id,
    name:     e.title,
    start:    new Date(e.start_time),
    end:      new Date(e.end_time),
    location: e.location,
  }))
}

export const eventQueryOptions = {
  list: () => queryOptions({
    queryKey: ['events'],
    queryFn:  fetchEvents,
  }),
}
