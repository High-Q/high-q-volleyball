# Proposal: 会場マスタ CRUD（管理画面）

> **承認ゲート**: このドキュメントをレビューし、実装者と承認者が合意してから次フェーズへ進むこと。

## Why

会場マスタ（`venues`）は MVP1 で seed データ固定のまま運用しており、会場の追加・住所修正・参加費変更・集合場所の調整はすべて DB を直接触る必要がある。イベント作成時に選べる会場はこのマスタが唯一の供給源なので、オーナーが画面から会場を増減・編集できないと運用が回らない。テーブル・RLS・型はすでに揃っているため、今回は **管理画面 UI だけ** を載せて MVP2 で UI 化を完了させる。

## What Changes

- admin に **会場マスタの一覧・新規作成・編集・削除** 画面を追加する（events-crud と同じ構成を踏襲）
- 会場一覧をメインバッジ・会場名・住所・標準参加費・アクセスメモ・マップリンクの DataTable で表示し、会場名／住所で絞り込める
- 会場フォームで全編集列（会場名・住所・標準参加費・アクセスメモ・マップリンク・集合場所・メイン会場フラグ）を編集できる。`meeting_point`（集合場所）の編集 UI はこの画面の責務（`reservation-events-and-booking` spec が #151 へ委譲済み）
- メイン会場フラグは最大 1 件の制約に従い、別会場をメインに設定したら **既存メインを自動で解除** する
- 参照中の会場の削除は DB が拒否するため、削除実行後にエラーを捕捉して **「使用中のため削除できません」** と理由を提示する
- ダッシュボード／既存ヘッダーに「会場」への水平リンクを双方向対称で追加する

### Non-Goals（今回やらないこと）

- `venues` テーブル・RLS・GRANT の変更（MVP1 で完備済み・**migration 不要**）
- 会場と紐づく写真・キャンセルポリシー等の付帯情報（MVP1 でスコープアウト済み）
- 会場の論理削除（soft delete）や履歴管理
- LP／予約サイト側の会場表示の変更

## Capabilities

### New Capabilities
- `admin-venues-crud`: admin での会場マスタの一覧・検索・新規作成・編集・削除と、メイン会場フラグの一意性・参照中会場の削除防御の振る舞いを規定する

### Modified Capabilities
<!-- 既存 spec の要件変更なし。venues テーブル定義（data-schema）/ RLS（rls-policies）はそのまま利用 -->

## Impact

- **新規 pages**: `VenuesListPage` / `VenueCreatePage` / `VenueEditPage`（events-crud と同型）
- **新規 widget**: `venue-form`（作成・編集兼用フォーム）
- **新規 feature**: `venue-delete`（削除ダイアログ＋composable）
- **entity 拡張**: `entities/venue` に CRUD クエリ（`fetchVenues` / `fetchVenue` / `createVenue` / `updateVenue` / `deleteVenue`）を追加（現状は filter 用 read のみ）
- **routing**: `/venues`・`/venues/new`・`/venues/:id/edit` を追加（admin auth guard 配下）
- **ナビゲーション**: Dashboard 等ヘッダーへの「会場」リンク追加（双方向対称）
- **DB**: 変更なし（既存 `venues` テーブル・RLS・GRANT をそのまま使用）
