## Why

LP のハンバーガーメニューが、ヘッダー直下にインライン展開する簡素な実装のままで、LP 全体の和紙トーンと刷新後のデザイン言語（大型タイポ・番号付きインデックス・余白の効いたエディトリアル感）から浮いている。プロトタイプ `HighQ Hamburger Drawer.html` の意匠に揃えることで、ナビゲーション体験そのものを LP のブランド表現の一部に格上げする。

## What Changes

- ハンバーガー押下時の挙動を **インライン展開型 → フルスクリーン Drawer 型** に変更
- Drawer 内のナビゲーションリンクを **大型タイポ + 番号 (01–05) + 末尾矢印** のエディトリアル形式に再構成
- ハンバーガーアイコンを 2 本線 → ✕ への滑らかなアニメーションに変更
- Drawer 開放中は **body スクロールを lock** し、Drawer 内コンテンツのみスクロール可能に
- Drawer 末尾に **sticky な CTA フッタ** を追加（Primary: LINE オープンチャット / Secondary: イベント一覧へスクロール）。final-cta の CTA 戦略と同期
- アクセシビリティ強化: `aria-hidden` / `aria-expanded` / Esc 閉じる / 開放時に最初のリンクへフォーカス移動 / 閉じた後にトリガーへフォーカスを戻す
- `prefers-reduced-motion` でアニメーションを無効化

非対応: 画面右下のフローティング LINE FAB は本変更のスコープ外（別 Issue で扱う）。

## Capabilities

### New Capabilities

なし。

### Modified Capabilities

- `lp-layout`: ヘッダーのナビゲーション要件（現行「ドロップダウンメニュー」を「フルスクリーン Drawer」に置き換え、Drawer 固有のアクセシビリティ要件を追加）

## Impact

- **コード**: `apps/lp/src/widgets/site-header/ui/SiteHeader.vue`（Drawer 化に伴う構造刷新）。Drawer を別 widget に切り出すかは Design で判断。
- **テスト**: LP E2E のヘッダー周辺シナリオ（メニュー開閉・リンク遷移）を Drawer 前提に更新。新規シナリオとして「Esc で閉じる」「body lock」「フォーカス復帰」を追加する可能性あり。
- **デザイントークン**: 既存の `--hq-*` で完結。新規トークン追加なし（プロトタイプは既存トークンのみで構成済み）。
- **依存**: 追加なし。
- **リリース**: `release/lp-redesign-v2` に統合してから master へマージ（既存 LP UI 改変フローを踏襲）。
