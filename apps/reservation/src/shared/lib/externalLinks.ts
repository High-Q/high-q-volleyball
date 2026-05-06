const lpOrigin =
  (import.meta.env["VITE_LP_ORIGIN"] as string | undefined) ??
  "https://high-q-volleyball.onrender.com";

export const EXTERNAL_TRANSMISSION_URL = `${lpOrigin.replace(/\/$/, "")}/external-transmission`;
