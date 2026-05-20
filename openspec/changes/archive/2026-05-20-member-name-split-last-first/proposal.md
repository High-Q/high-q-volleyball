## Why

会員登録フォームの氏名入力が 1 フィールド (`お名前`) のため、姓だけ入れて名を入れ忘れる会員が実運用で発生している。運営側は本人特定や呼びかけで困っており、構造的に「姓 + 名が両方揃った状態」を保証する必要がある（Issue #281）。

## What Changes

- 会員登録フォームの氏名入力を **姓・名 2 つの独立した必須フィールド** に分離し、片方が空のままでは送信できないようにする
- 会員データに姓・名を **独立した属性** として保持し、これまでの結合表示（"姓 名" の 1 文字列）も互換のまま参照できる構造にする（既存の検索・表示・並び替えロジックを壊さない）
- 会員プロフィール編集画面でも姓・名を個別に編集できるようにする
- 既存会員データは姓・名に分離した形へ **一括移行** する。空白区切りで分けられない例外行は、運営に検知可能な形でフラグを残し、後続の運用フォローで補正する
- signup 確定フロー（メールコード方式）の中間データ構造も姓・名 2 属性を保持する形に拡張する
- 管理画面のイベント参加者一覧 / 会員一覧 / 本人確認書類レビューなど、これまで結合氏名を参照していた箇所は **挙動・見た目を維持** する（読み出し側を壊さない）

### 明示的に対象外（非ゴール）

- ふりがな（姓ふりがな / 名ふりがな）の追加 — 本 Issue のスコープ外、必要なら別 Issue
- ミドルネーム / 外国人名のフル対応 — 日本国内サークル運用の前提として MVP1 では扱わない
- 表示順序の国際化（姓-名 ↔ 名-姓） — 常に「姓 名」順固定

## Capabilities

### New Capabilities

なし

### Modified Capabilities

- `data-schema`: `members` テーブルに姓・名を保持する 2 属性を追加し、結合表示用属性との関係を規定する。移行・既存参照との互換ルールを追加する
- `reservation-member-auth`: signup フォームの入力契約と Edge Function `request-signup` の payload バリデーションを姓・名 2 属性に分離する。`signup_pending` の中間 payload も同様
- `reservation-profile-page`: 会員プロフィール編集で姓・名を個別に編集できるようにする

admin 側の検索・表示は読み出し互換性によって挙動・見た目が維持されるため、本 change での spec 変更はしない（admin-members-list / admin-event-detail / admin-identity-document-review の `display_name` 読み出しはトリガ同期により従来通り動作する）。

## Impact

- 予約サイト: signup フォーム / プロフィール編集画面 / 関連 composable / Edge Function 呼び出し payload
- 管理画面: 会員一覧の検索・並び替え、会員詳細、イベント参加者表示、本人確認書類レビュー（読み出し互換を維持する形で）
- DB: `members` テーブル列追加 + データ移行 + ビュー互換確認 + RLS 確認
- Edge Function: `request-signup` のサーバ側バリデーション、`verify-signup` の INSERT、`signup_pending.payload` schema
- spec 更新: `data-schema` / `reservation-member-auth` / `reservation-profile-page` / `admin-members-list`
- 既存 spec の `display_name` 参照箇所は読み出し契約として維持。表示文言は変更しない
- 移行リスク: 商用稼働中の dev/prd Supabase に対する DDL + データ更新を伴う。Render 自動デプロイのタイミングと migration の手動 push を揃える運用が必要（既知の運用ルール）
