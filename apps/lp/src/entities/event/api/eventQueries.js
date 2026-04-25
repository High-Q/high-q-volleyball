import { queryOptions } from '@tanstack/vue-query'

// 開発時は Vite プロキシ経由で CORS を回避（vite.config.js で /api/event → AWS にリライト）
const API_URL = import.meta.env.DEV
  ? '/api/event'
  : 'https://ptfomh71x9.execute-api.ap-northeast-1.amazonaws.com/beta/event'

async function fetchEvents() {
  let res
  try {
    res = await fetch(API_URL)
  } catch {
    // CORS ブロックやネットワーク不達の場合は空配列で代替
    // （本番ドメイン以外の Render プレビュー等で発生する）
    return []
  }
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
