import { queryOptions } from '@tanstack/vue-query'
import { getSupabase } from '@shared/api'

async function fetchEvents() {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('events')
    .select('id, name, start_at, end_at, venues(name)')
    .eq('visibility', 'published')
    .gte('start_at', new Date().toISOString())
    .order('start_at', { ascending: true })

  if (error) {
    throw new Error(error.message || 'failed to fetch events')
  }
  return (data ?? []).map((row) => ({
    id:       row.id,
    name:     row.name,
    start:    new Date(row.start_at),
    end:      new Date(row.end_at),
    location: row.venues?.name ?? '',
  }))
}

export const eventQueryOptions = {
  list: () => queryOptions({
    queryKey: ['events'],
    queryFn:  fetchEvents,
  }),
}
