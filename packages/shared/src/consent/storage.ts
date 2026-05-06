import {
  CONSENT_STORAGE_KEY,
  type ConsentChangeHandler,
  type ConsentDecision,
  type ConsentInput,
} from "./types.js";

let inMemoryFallback: ConsentDecision | null = null;
const subscribers = new Set<ConsentChangeHandler>();

function isConsentDecision(value: unknown): value is ConsentDecision {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    v["necessary"] === true &&
    typeof v["analytics"] === "boolean" &&
    typeof v["decidedAt"] === "string"
  );
}

function readFromStorage(): ConsentDecision | null {
  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    return isConsentDecision(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function getConsent(): ConsentDecision | null {
  const fromStorage = readFromStorage();
  if (fromStorage !== null) return fromStorage;
  return inMemoryFallback;
}

export function setConsent(input: ConsentInput): void {
  const decision: ConsentDecision = {
    necessary: true,
    analytics: input.analytics,
    decidedAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(decision));
    inMemoryFallback = null;
  } catch {
    inMemoryFallback = decision;
  }

  for (const handler of subscribers) {
    handler(decision);
  }
}

export function onConsentChange(handler: ConsentChangeHandler): () => void {
  subscribers.add(handler);
  return () => {
    subscribers.delete(handler);
  };
}

/** @internal テスト用: モジュール内部の購読者と fallback をリセット */
export function __resetConsentForTest(): void {
  subscribers.clear();
  inMemoryFallback = null;
}
