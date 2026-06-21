## 1. DB マイグレーション（events.email_note 追加）

- [x] 1.1 `supabase/migrations/` に新規 migration を追加し `events` へ `email_note text NULL` を ADD COLUMN する。`-- ROLLBACK:` コメント（`alter table events drop column email_note;`）を含める。既存テーブルの ALTER のため RLS ポリシー変更は不要（既存 events ポリシーを継承）
- [x] 1.2 dev DB へ適用。※dev は未マージ #344 ブランチの migration 履歴（20260618000000 / 20260619000000）が記録されており `db push` が履歴ズレで停止するため、冪等な本 migration ファイルを `supabase db query --linked --file` で直接適用し列追加を確認（prd は CI 承認ゲートで正規適用される）

## 2. 型の更新

- [x] 2.1 `packages/shared/src/types/entities.ts` の `Event` 型に `email_note: string | null` を追加
- [x] 2.2 `apps/admin/src/entities/event/model/event.types.ts` の関連 DTO（フォーム入力型 / EventListRow 等、`email_note` を扱う箇所）に `email_note` を追加。一覧表示 DTO は掲載不要なら触らない

## 3. admin イベントフォームへの「メール追記メッセージ」欄追加

- [x] 3.1 【TDD】`apps/admin/src/widgets/event-form/model/eventFormSchema.ts` に `emailNote`（任意・前後トリム・最大文字数）を追加し、スキーマのユニットテストを追加（任意で空を許容 / 上限超過で reject / トリム）
- [x] 3.2 `apps/admin/src/widgets/event-form/ui/SectionBasic.vue` に「メール追記メッセージ（任意）」textarea を `shared/ui/FormField` でラップして参加費／定員の近くに配置。hint に「予約完了/変更メールの末尾に会員へ掲載される。懇親会案内や当日の集合補足に使う。会場周辺の注意事項は会場マスタのアクセスメモ側に書く」旨を表示
- [x] 3.3 イベント作成/編集 mutation（events INSERT / UPDATE を行う composable・API）に `email_note` を含める。空欄は NULL（または空）として投入し、入力値は前後トリムして保存
- [x] 3.4 会場編集画面（admin-venues-crud）のアクセスメモ欄 hint に「この内容は予約完了/変更メールに会員へ掲載される」旨を追記し、運用者へ周知

## 4. Edge Function メール文面への掲載

- [x] 4.1 `supabase/functions/_shared/reservation-mail-inputs.ts` のメール入力取得クエリに `events.email_note` と `venues.access_note` を追加し、入力 DTO に `eventEmailNote` / `venueAccessNote`（optional）を追加
- [x] 4.2 【TDD】`supabase/functions/_shared/mailer-templates.ts` の予約完了 / 予約内容変更 / 繰り上げレンダラに、会場ブロック直後へ「注意事項」（venueAccessNote）→「ご案内」（eventEmailNote）を隣接掲載（主催側の案内をまとめ、会員の連絡事項は参加費の後に分離）。空（NULL / 空文字 / トリム後空）のときはセクションごと非掲載、改行は保持。キャンセルメールには掲載しない
- [x] 4.3 【TDD】`mailer-templates.spec.ts`（および必要なら `reservation-mail-inputs.spec.ts`）を拡張: (a) 両方設定あり=両セクション描画 (b) 両方空=従来どおり非描画 (c) 片方のみ設定 (d) 純粋関数性（同一入力→同一出力）(e) キャンセルメールには非掲載

## 5. 最終確認

- [x] 5.1 admin の関連ユニット/コンポーネントテストと Edge Function テストをまとめて実行（`pnpm exec vitest run` / Deno テスト）し緑を確認
- [ ] 5.2 dev DB + dev ログイン（`pnpm dev:login`）で動作確認: イベントにメール追記メッセージを設定 → 予約 → 完了メールに「注意事項」「ご案内」が掲載されること、空欄イベントでは非描画になることを確認（送信抑制/許可リスト設定下で）
