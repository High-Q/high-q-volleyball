const FALLBACK_RESERVATION_URL = "https://high-q-reservation.onrender.com";

const RAW: string = import.meta.env.VITE_RESERVATION_URL || FALLBACK_RESERVATION_URL;

function normalize(base: string): string {
  return typeof base === "string" ? base.replace(/\/+$/, "") : "";
}

export function reservationBaseUrl(): string {
  return normalize(RAW);
}

export function reservationUrlConfigured(): boolean {
  return reservationBaseUrl().length > 0;
}

export function reservationEventUrl(eventId: string): string {
  const base = reservationBaseUrl();
  if (!base || !eventId) return "";
  return `${base}/events/${encodeURIComponent(eventId)}`;
}

export function reservationTopUrl(): string {
  const base = reservationBaseUrl();
  return base || "";
}
