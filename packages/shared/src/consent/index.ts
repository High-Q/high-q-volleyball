export {
  CONSENT_STORAGE_KEY,
  type ConsentCategory,
  type ConsentChangeHandler,
  type ConsentDecision,
  type ConsentInput,
} from "./types.js";

export { getConsent, setConsent, onConsentChange } from "./storage.js";
