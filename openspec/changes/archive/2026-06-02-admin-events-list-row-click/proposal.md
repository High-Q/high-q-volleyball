## Why

`/events` 一覧画面で、行から詳細画面へ遷移できるタップ範囲が**タイトル列のみ**に限定されており、他のセル（日付・会場・時間・予約・ステータス）は dead area になっている。オーナーが一覧から詳細を開く操作は最頻動線で、数 px の精度を要求するタップ範囲は効率を落とす。

過去の `admin-events-list` capability では「同一行に編集リンクがあり誤操作リスクがあるため行全体クリックは行わない」と決定されていたが、編集列を除外する形であれば誤操作懸念は解消できる。MVP1 リリース後の運用効率化（MVP2 スコープ）として、行クリックを有効化する。

## What Changes

- **BREAKING (仕様)**: `admin-events-list` capability 「一覧から詳細画面への遷移動線」の判断を反転。「行全体は非リンク」を「編集列を除く行全体がリンク」に変更
- 行内セル（日付 / タイトル / 会場 / 時間 / 予約 / ステータス）のいずれをクリック / タップしても `/events/:id` へ遷移
- 「操作」列の「編集」リンクは既存どおり `/events/:id/edit` へ遷移（行クリック遷移は奪わない）
- ソート可能列ヘッダー（日付・ステータス）のソート機能は回帰しない
- 行ホバー時の視覚フィードバックは既存 `TableRow` の `hover:bg-paper-warm` を引き続き活用
- キーボード操作（Tab で行に focus、Enter で詳細遷移）に対応

## Capabilities

### New Capabilities

なし

### Modified Capabilities

- `admin-events-list`: 「一覧から詳細画面への遷移動線」Requirement を行全体クリック前提に書き換え（編集列はクリック範囲から除外）

## Impact

- 実装対象: `apps/admin/src/widgets/events-list/ui/EventsTable.vue`（行全体クリック化）
- テスト対象: `apps/admin/src/widgets/events-list/ui/EventsTable.spec.ts`（行クリック / 編集列クリック / キーボード遷移の component test 追加）
- スコープ外: `apps/reservation` 側（EventsListPage 等）— 別 Issue で個別対応
- 既存挙動への影響: タイトルセル内のクリック挙動・編集リンク・ソート可能ヘッダーの動作は維持
