import { createSupabaseClient } from '@high-q/shared/api'

let client = null

export function getSupabase() {
  if (client === null) {
    client = createSupabaseClient()
  }
  return client
}

export function _resetSupabaseForTest() {
  client = null
}
