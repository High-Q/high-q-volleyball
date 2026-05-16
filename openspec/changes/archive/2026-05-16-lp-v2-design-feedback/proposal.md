## Why

Issue #160 (LP redesign v2) の Render Preview / ローカル確認を経て、翔太郎くんから複数ラウンドにわたり詳細なデザインフィードバックを受領した。これらは `lp-redesign-v2` change のスコープには収まるが、初回 propose では予期できなかった「プロトタイプ準拠の精度向上」「PC レスポンシブ」「デザイントークン体系の意味整理」「アクセント色の配置最適化」「ハンバーガーメニュー追加」など複数の軸にまたがる修正群であり、独立 change として整理することで、商用リリース前の最終ポリッシュとして可視化する。

並行して Issue #238 (Button variant 名と実色の意味乖離) も発覚しており、accent 色トーン調整 (`#b85c3c → #a44e30`) と warn 色振り直し (`#c08442 → #d4a04a`) を伴うため、デザイントークン横断の作業として本変更で同時対応する。

本 change は LP 商用リリース前の最終統合 (`release/lp-redesign-v2` ブランチ) に取り込まれ、`#160` 本体 / `#237` (絵文字 SVG 化) と並んで master へ昇格する。

## What Changes

- `@high-q/ui` Button の variant 体系を意味整理する (`primary` を ink 背景の主要 CTA に維持、`secondary` → `outline` にリネーム、`danger` を本物の destructive 色 `#9c4030` に正規化)
- デザイントークンの accent / warn 色を WCAG コントラスト + 差別化のため微調整する
- LP の全コンポーネント・全テキスト要素の文字色をプロトタイプ準拠で再マッピングする (accent オレンジは kicker / 番号 / Q マーカー / NEXT タグ / focus outline のみに集約)
- セクション背景色をプロトタイプ準拠で再配置する (Worries / NextStrip を dark theme に復元)
- 全幅レイアウト + セクション内コンテンツの max-width クランプで PC レスポンシブを成立させる
- Google Fonts (Klee One / Shippori Mincho / Zen Kaku Gothic New / JetBrains Mono) を index.html から load し、HQ デザイントークン宣言の font-family を実描画に反映する
- Cookie 同意 Banner を Vuetify `v-snackbar` 依存から `<Teleport>` + HQ トークンベースに再実装する
- Footer に LP 内アンカーリンク (About / Features / 当日の流れ / Events / FAQ) を追加し、Instagram リンクは未開設のため一時撤去する
- SiteHeader にプロトタイプ準拠のハンバーガーアイコン (2 本線) を追加し、タップで LP 内アンカーリンクのドロップダウンメニューを開閉できるようにする
- セクション kicker のダッシュ「— 」prefix を全箇所に統一する
- スクロール連動フェードインを廃止する (spec 改修)

## Capabilities

### Modified Capabilities

- `lp-layout`: ヘッダーのナビゲーション要素 (ハンバーガー + ドロップダウン)、内側コンテンツ幅キャップ、配色リズムの正規化、フォント load 要件を加える

## Impact

- 影響アプリ: `apps/lp` 全面、`apps/admin` / `apps/reservation` は Button variant リネームのみ
- 共通基盤: `packages/design-tokens` の accent / warn 値を変更、`packages/ui` の Button variant 体系を再定義 (破壊変更なしで `outline` 新設・`danger` 色変更)
- ブランチ戦略: `release/lp-redesign-v2` 統合ブランチ配下の `feature/238-button-variant-tokens-refactor` で先行実装済み (PR #239)。本 change はこれを正規化し、ハンバーガー追加分を本 PR に積み上げる
- 環境変数: 追加なし
- 依存: Issue #160 / #237 / #238、いずれも `release/lp-redesign-v2` で統合
- Render Preview: PR #239 の Preview URL で確認可能 (prd Supabase + 環境変数)
