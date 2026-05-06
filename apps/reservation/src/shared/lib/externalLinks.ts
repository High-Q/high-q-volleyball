const lpOrigin =
  (import.meta.env["VITE_LP_ORIGIN"] as string | undefined) ??
  "https://high-q-volleyball.onrender.com";

const normalizedLpOrigin = lpOrigin.replace(/\/$/, "");

export const EXTERNAL_TRANSMISSION_URL = `${normalizedLpOrigin}/external-transmission`;
export const PRIVACY_POLICY_URL = `${normalizedLpOrigin}/privacy`;
