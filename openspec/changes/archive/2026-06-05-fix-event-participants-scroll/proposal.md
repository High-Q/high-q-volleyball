## Why

イベント詳細画面（`/events/:id`）で参加者が多いイベントを開くと、参加者一覧テーブルが画面下端を超えても**内側スクロールが効かず**、画面外の予約者を確認できない。当日チェックインを画面で完結させる前提が崩れ、オーナー（翔太郎くん本人）が運営中に手こずる。MVP1 締切前に解消する。

参加者一覧 Widget のルート要素が親 flex コンテナ内で高さを持たない構造になっており、内側の overflow が依拠する高さが決まらないことが根本原因。同種パターンを持つ他 Widget（events-list / members-list / identity-documents-list / identity-document-detail）は同等構造でも `h-full` を備えているため、症状は参加者一覧 Widget 固有。

## What Changes

- 参加者一覧 Widget のレイアウト構造を修正し、テーブル領域内のみで縦スクロールするようにする
- TopBar / StatCards / RemainBar / Tabs は固定位置のままページ全体スクロールにはならない
- Empty / Loading / Error / Success の 4 状態すべてで内側スクロールレイアウトが崩れないことを保証する
- モバイル幅（375px）でもスクロール挙動が機能することを保証する
- 同種パターンの他 admin Widget を grep で再点検し、見落としがあれば同 PR で修正（事前調査では当該 Widget のみが該当）
- 仕様（`admin-event-detail` spec）にレイアウト要件として明文化し、回帰を防ぐ

## Capabilities

### New Capabilities

なし。

### Modified Capabilities

- `admin-event-detail`: 参加者一覧の表示要件に「テーブル領域内での内側スクロール（外側のページスクロール禁止）」を追加。固定要素（TopBar / StatCards / RemainBar / Tabs）と可変要素（参加者テーブル）のレイアウト境界を明示する。

## Impact

- **コード**: `apps/admin/src/widgets/event-participants/ui/EventParticipantsWidget.vue` のテンプレート ルート div の class 修正。logic 部分には触らない。
- **テスト**: 既存の `EventParticipantsTable.spec.ts` は影響なし。Widget レイアウト挙動の単体テストは追加せず（Vitest + jsdom では実レイアウト・スクロール計算が走らないため意味が薄い）、admin E2E ハッピーパス（イベント詳細表示）で 4 状態のレンダリングが崩れないことを担保する。
- **影響範囲**: 当 Widget のみ。親 `EventDetailWidget` / `EventDetailPage` の構造は既に正しく、変更不要。
- **デザイントークン / API / DB**: 変更なし。
- **依存関係**: なし。
