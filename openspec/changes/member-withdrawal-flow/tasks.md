## 1. DB マイグレーション

- [x] 1.1 `reservations.member_id` を NULL 許容 + FK 動作を `ON DELETE SET NULL` に変更するマイグレーションを作成（dev → prd の順で apply）
- [x] 1.2 `member_history_view` を `WHERE member_id IS NOT NULL` フィルタ追加版に置換するマイグレーション
- [x] 1.3 `event_participants_view` を `members` LEFT JOIN + `COALESCE(display_name, '退会済み会員')` 版に置換するマイグレーション
- [x] 1.4 `reservations` の INSERT 時 RLS WITH CHECK 句に `member_id IS NOT NULL` を追加するマイグレーション
- [x] 1.5 マイグレーション後の DB 整合性テスト（既存 member 削除 → reservations 残存 / identity_documents 連鎖削除を検証）+ 退会後の reservations 行の `phone_at_booking` / `note` が NULL であることを SQL レベルで検証する fixture

## 2. Edge Function `withdraw-member`

- [x] 2.1 `supabase/functions/withdraw-member/` を新規作成（index.ts / deno.json / README）
- [x] 2.2 JWT 検証 + 認可ロジック（本人 or admin 判定）の実装と単体テスト
- [x] 2.3 未来予約キャンセル（`status IN ('reserved', 'waitlist')` → `'cancelled'`）の実装と単体テスト
- [x] 2.4 reservations 個人情報列 NULL 化（`phone_at_booking = NULL` / `note = NULL`）の実装と単体テスト（退会後の SELECT で両列が NULL であることを検証）
- [x] 2.5 Storage オブジェクト削除（`identity-documents/<member_id>/` 配下を list → remove）の実装と単体テスト
- [x] 2.6 `members` DELETE + `auth.users` DELETE の実装と単体テスト
- [x] 2.7 冪等性（target 不在で 204）と失敗時 500 のハンドリング実装（順序: 認可→未来予約キャンセル→個人情報列 NULL 化→Storage 削除→members DELETE→auth.users DELETE）
- [x] 2.8 Function ログ（実行者 / 対象 / 結果）の出力
- [x] 2.9 dev 環境への deploy と curl での疎通確認

## 3. admin アプリ — 詳細 sheet 削除セクション

- [x] 3.1 `widgets/member-detail-sheet` に「危険な操作」セクション + 削除ボタンを追加
- [x] 3.2 削除確認 AlertDialog（警告 + 削除対象列挙 + メール再入力 + danger ボタン）を実装
- [x] 3.3 メール再入力一致判定で削除ボタンの enable/disable を制御
- [x] 3.4 削除実行ロジック（`withdraw-member` 呼び出し + 楽観的更新 + Toast）を `features/member-withdrawal` として実装
- [x] 3.5 成功 / 失敗 / ネットワーク失敗の 3 経路の UI ハンドリング
- [x] 3.6 component test（dialog 表示・メール一致・削除呼び出し・失敗時再試行）

## 4. reservation アプリ — `/profile` 削除セクション

- [x] 4.1 `pages/ProfilePage` 最下部に「アカウント削除」セクション + 削除ボタンを追加
- [x] 4.2 削除確認 Dialog（警告 + 同意チェックボックス + danger ボタン）を実装
- [x] 4.3 削除実行ロジック（`withdraw-member` 呼び出し + signOut + LP リダイレクト）を `features/account-deletion` として実装
- [x] 4.4 成功 / 失敗 / ネットワーク失敗の 3 経路の UI ハンドリング
- [x] 4.5 LP 側の完了メッセージ表示動線（クエリ or フラグメント）と LP 側受け取り実装
- [x] 4.6 component test（dialog 表示・チェック制御・削除呼び出し・失敗時再試行）

## 5. 認証・セッション連動

- [x] 5.1 `useAuthSession`（reservation）で「session 有 + members 行不在」検知時に自動 signOut + `/login?error=member_not_found` 遷移する処理を追加
- [x] 5.2 `/login` 画面に `error=member_not_found` 時のエラーメッセージ表示を追加
- [x] 5.3 unit test: session 有 + members 不在の状況で自動 signOut が走ることを検証

## 6. 個人情報保護方針ページ更新

- [x] 6.1 `/privacy` ページ本文に「退会時に削除される対象」と「退会後も匿名化されて残る参加履歴」の記述を追記
- [x] 6.2 `docs/06-品質・セキュリティ/06-個人情報保護方針.md` と `08-本人確認書類取扱SOP.md` を spec と整合させて更新

## 7. E2E テスト

- [x] 7.1 reservation E2E: 退会後の `/login?error=member_not_found` メッセージ表示確認（認証済みフローは component test に押し下げ、CLAUDE.md E2E スケーラビリティルール準拠）
- [x] 7.2 admin E2E: `/members?detail=` 付き URL でも auth ガードが効くことを確認（認証済みフローは component test に押し下げ）

## 8. 最終確認・統合

- [x] 8.1 `pnpm -r test` 全パス確認（74 + 90 + 11 + 7 + 28 + 50 + 620 + 751 = 1631 件 PASS）
- [x] 8.2 `pnpm -r build` 全パス確認（lp / reservation / admin）
- [ ] 8.3 dev 環境エンドツーエンド動作確認（admin / reservation 両経路で実際に削除して整合性確認）— 翔太郎くんの Render Preview 確認に委ねる
- [ ] 8.4 #254 / #255 の完了条件チェックリストを照合し、未充足項目があれば対応

## 9. Sync / Archive / Ship

- [ ] 9.1 `/opsx:sync` で `openspec/specs/` および `docs/` を更新
- [ ] 9.2 `/opsx:archive` で change を archive へ移動
- [ ] 9.3 PR に sync / archive のコミットを push し master へマージ
- [ ] 9.4 ブランチ削除 + #254 / #255 を Done でクローズ
