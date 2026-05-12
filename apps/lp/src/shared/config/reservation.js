const RAW = import.meta.env.VITE_RESERVATION_URL ?? ''

function normalize(base) {
  return typeof base === 'string' ? base.replace(/\/+$/, '') : ''
}

export function reservationBaseUrl() {
  return normalize(RAW)
}

export function reservationUrlConfigured() {
  return reservationBaseUrl().length > 0
}

export function reservationEventUrl(eventId) {
  const base = reservationBaseUrl()
  if (!base || !eventId) return ''
  return `${base}/events/${encodeURIComponent(eventId)}`
}

export function reservationTopUrl() {
  const base = reservationBaseUrl()
  return base || ''
}
