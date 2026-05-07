## Why

予約詳細画面 (#213) からは現状キャンセル動線しか提供されておらず、同伴者数や連絡事項を後追いで修正する経路がない。当日「同伴者 1 名が来られなくなった」状況でも、予約全体をキャンセルして再予約しなければ調整できない UX 上の痛みが残っている。新規予約時の確認 sheet と UI を共通化することで、設計コストを抑えつつ後追い編集動線を提供し、Epic #170「メンバーが High Q に参加し、繰り返す」のジャーニーを完成させる。

## What Changes

- 予約詳細画面の Meta テーブル直下に「予約内容を変更する」CTA を追加
- 押下で編集用の Bottom Sheet を立ち上げ、同伴者数 stepper・連絡事項 textarea・合計金額再計算カード・戻る/保存 CTA を表示する
- 編集 sheet は新規予約時の確認 sheet と同一コンポーネントを **作成 / 編集** モードで共有し、kicker 文言・CTA ラベル・初期値供給元を mode 単位で切り替える
- 編集対象は同伴者数と連絡事項の 2 項目のみ。日時 / 会場 / イベント / 経験レベルは編集対象外（変更したい場合はキャンセル → 再予約で対応）
- 編集可能期限は **既存キャンセル可能期限と完全一致** させ、JST カレンダー基準で「開催前日 23:59 JST まで」とする。当日 0:00 JST 以降は編集 CTA を非活性化し、当日連絡は LINE オープンチャットに案内
- 「変更なし保存」を抑制するため、現在値と差分がない状態では保存 CTA を非活性とする
- 編集 sheet では入力内容のローカル保持（localStorage 復元）は行わず、毎回サーバーの最新値で初期化する
- 保存成功で sheet を閉じ、Meta テーブルが新値で再描画され、完了トーストを表示する

## Capabilities

### New Capabilities
- なし

### Modified Capabilities
- `reservation-booking-flow`: Bottom Sheet を「予約確認用 (新規 INSERT)」専用から「**編集兼用**」へ拡張する。確定 sheet が編集モードを取り、UPDATE 経路と保存 CTA 制御 (差分なし時 disabled) を許容する形に要件を更新する。ローカル保持の対象は新規モードのみであることを明示する
- `reservation-detail-page`: Meta テーブル直下に「予約内容を変更する」CTA を追加し、同伴者数・連絡事項の編集動線とその可否判定 (キャンセル可否と同基準) を要件として明文化する
- `rls-policies`: `reservations` の UPDATE ポリシー記述が実装より厳しく (「キャンセルのみ可」と読める) なっており、実 migration では「自分の `status='reserved' or 'cancelled'` 行であれば任意列の UPDATE が通る」状態になっている。本 change で「自分の予約の `guest_count` / `note` 編集も含む」よう spec 文言を実装と整合させる。SQL ポリシー自体の変更は伴わない (文言調整のみ)

## Impact

- **影響レイヤー**: `apps/reservation` の予約詳細 page / 既存 booking sheet widget / `entities/reservation` API 層 / `features/booking` の composable 群
- **DB / RLS**: 新規スキーマ変更・新規 SQL migration は伴わない。既存 `reservations` UPDATE ポリシーは実装上「自分の `status IN ('reserved','cancelled')` 行に対する任意列の UPDATE」を既に許容しており、`guest_count` / `note` 編集はそのまま通る。本 change では rls-policies spec の文言だけを実装と整合させる
- **テスト**: 既存 component test に編集モードのシナリオ (初期値復元 / 差分検知 / 保存成功 / 期限切れ非活性 / RLS 失敗) を追加。E2E は本 capability で新規追加しない (既存 reservation-detail-page の auth guard E2E を継続流用)
- **依存**: 前提として #213 のマージ完了が必要 (master 取り込み済)
