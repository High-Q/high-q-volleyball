/**
 * GTM の consent gate ロード.
 *
 * - analytics 同意が無いユーザーには gtm.js を一切ロードしない (法令準拠)
 * - 同意済ユーザーには動的 script tag を `<head>` に挿入してロード
 * - 同一ページで複数回呼ばれた場合の二重ロードはガードする
 */
export const GTM_ID = "GTM-WNNF9RP";

let injected = false;

export function isGtmInjected(): boolean {
  return injected;
}

/**
 * テスト用: モジュール内部の挿入フラグをリセットする.
 * @internal
 */
export function __resetGtmForTest(): void {
  injected = false;
}

export function loadGtm(gtmId: string = GTM_ID): void {
  if (injected) return;
  if (typeof document === "undefined") return;

  // dataLayer の初期化と gtm.start イベントの push (GTM 標準スニペットと同等)
  const w = window as unknown as { dataLayer?: unknown[] };
  w.dataLayer = w.dataLayer ?? [];
  w.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${gtmId}`;
  script.dataset["hqGtm"] = "true";
  document.head.appendChild(script);

  injected = true;
}
