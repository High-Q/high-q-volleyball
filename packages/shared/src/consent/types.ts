/**
 * Cookie 同意状態の型定義 (改正電気通信事業法 §27の12 対応).
 *
 * カテゴリは 2 区分のみ:
 *   - necessary: 拒否不可 (Supabase Auth セッション等の必須 cookie)
 *   - analytics: 任意 (GTM / GA 等)
 */

export type ConsentCategory = "necessary" | "analytics";

export type ConsentDecision = {
  readonly necessary: true;
  readonly analytics: boolean;
  readonly decidedAt: string;
};

export type ConsentInput = {
  readonly necessary: true;
  readonly analytics: boolean;
};

export type ConsentChangeHandler = (decision: ConsentDecision) => void;

export const CONSENT_STORAGE_KEY = "hq.consent.v1";
