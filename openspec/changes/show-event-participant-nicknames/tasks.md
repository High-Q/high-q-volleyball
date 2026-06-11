## 1. DB Migration: 参加者ニックネーム取得 RPC

- [x] 1.1 既存スキーマ確認結果: テーブル名は `reservations`、status 取りうる値は `('reserved', 'cancelled', 'attended', 'no_show')`、`reservations.member_id` は退会フロー migration (`20260516000000`) で `ON DELETE SET NULL` に変更済みで NULL 許容。退会フローで `member_id IS NULL` になる行が出現する。`members.nickname` は #200 で導入済み。既存 `event_participants_view` は admin 用で個人情報を含むため本 change では再利用せず、新規 RPC で純化された I/F を提供する。本 change の有効集合は `status IN ('reserved', 'attended') AND member_id IS NOT NULL`
- [x] 1.2 `supabase/migrations/20260607172803_create_event_participant_nicknames_rpc.sql` を新規作成:
  - `CREATE OR REPLACE FUNCTION public.get_event_participant_nicknames(p_event_id uuid) RETURNS TABLE (member_id uuid, nickname text, is_self boolean, guest_count smallint) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ ... $$;`
  - 前提チェック: `auth.uid()` が `p_event_id` に有効 `reservations.status IN ('reserved', 'attended')` を持つ場合のみ集合を返す (持たないときは早期 RETURN で空集合)
  - 戻り値集合は `reservations.status IN ('reserved', 'attended') AND reservations.member_id IS NOT NULL` の行のみ。`'cancelled'` / `'no_show'` および退会済み (`member_id IS NULL`) は除外
  - 並び順 `reservations.created_at ASC`
  - `GRANT EXECUTE ... TO authenticated;` / `REVOKE EXECUTE ... FROM anon, public;`
  - `-- ROLLBACK: drop function ...;` コメント
- [x] 1.3 dev Supabase に `pnpm exec supabase db push --linked --include-all` で apply 完了 (out-of-order 解消のため --include-all 付き)
- [x] 1.4 dev Supabase で構造 + 権限確認完了: `is_security_definer=true` / `search_path=public` / `EXECUTE` は authenticated のみ (anon=false / service_role=false)。機能 smoke test (実データでの戻り値検証) は Task 2.3 / 4.x の app integration test に集約

## 2. RPC TypeScript 型とクライアント API

- [x] 2.1 `apps/reservation/src/entities/event/model/event.types.ts` に `EventParticipantNickname` 型を追加 (memberId/nickname/isSelf/guestCount)
- [x] 2.2 `apps/reservation/src/entities/event/api/event-participants.ts` を新規作成: Supabase RPC を呼び出し camelCase + Branded Type の配列に変換 / エラー時 throw (既存 reservation-app の throw-style 規約に合わせる)
- [x] 2.3 `apps/reservation/src/entities/event/api/event-participants.spec.ts` で 5 ケース pass (RPC 呼出形 / 戻り値変換 / 空配列 / null フォールバック / error throw)

## 3. 参加者セクション UI 実装

- [x] 3.1 `apps/reservation/src/widgets/reservation-participants/` 新規作成 (Public API は `index.ts` 経由)
- [x] 3.2 `ReservationParticipantsSection.vue` 実装: Loading skeleton / 通常リスト / Error メッセージ の 3 状態
- [x] 3.3 nickname 未設定者は「参加メンバー」マスク (本名 / member_id 非表示)
- [x] 3.4 `isSelf === true` に「あなた」マーカー
- [x] 3.5 同伴者サマリ 0/1+ 切替
- [x] 3.6 HQ デザイントークン (`var(--hq-*)`) のみ使用、マジックナンバー無し
- [x] 3.7 `ReservationDetailPage.vue` に組み込み (Meta → 予約状況 → 参加者 → 編集 CTA → CancelPolicy → Cancel CTA の順)
- [x] 3.8 0 行 Empty は画面全体 404 に吸収。`loadParticipants` は `fetchMyReservation` 成功後のみ呼ぶ。RPC error は section 内エラー表示に留め、画面全体 Error には倒さない

## 4. 参加者セクション component test

- [x] 4.1〜4.6 component test 9 ケース pass (通常描画 / mask / self marker / guest summary / loading / section error / no retry button / 個人情報ネガティブ検証)

## 5. プロフィール画面のニックネーム公開周知

- [x] 5.1〜5.2 ニックネーム編集モーダル (`NicknameEditDialog.vue`) の `AlertDialogDescription` に補足文追加 (「同じ予約イベントの参加者に表示されます。お名前・メール・電話番号は他参加者には表示されません。」)
- [x] 5.3 nickname 未設定者でも `open=true` 時に常に補足文が描画される構造 (description は modal 開時に常時表示)
- [x] 5.4 `NicknameEditDialog.spec.ts` 2 ケース新規作成 (補足文の存在 / 未設定者でも表示)

## 6. プライバシーポリシー更新

- [x] 6.1 `apps/lp/src/pages/privacy/ui/PrivacyPolicyPage.vue` の「3. 利用目的」セクションに `<h3>会員間でのニックネーム表示について</h3>` 追加。表示範囲限定 + 個人情報非開示 + 未設定者の汎用表記を本文に明記
- [x] 6.2 「RPC」「RLS」「SECURITY DEFINER」等の技術用語は含めず、運用観点の自然文のみ使用
- [x] 6.3 最終更新日を 2026-05-06 → 2026-06-08 に更新、改定履歴に本変更のエントリを追加

## 7. 最終確認 (UI 連続変更につき 1 回まとめて実施)

- [x] 7.1 `pnpm exec vitest run` 全パス: reservation 760/760 / lp 45/45 / admin 828/828 (合計 1633 件)
- [x] 7.2 `pnpm --filter @high-q/reservation build` ✓ / `pnpm --filter @high-q/lp build` ✓
- [x] 7.3 `pnpm exec eslint --max-warnings 0` 本 PR で追加・編集した新規ファイル群はクリア (pre-existing tech debt: NicknameEditDialog.vue の features→features 依存は master でも検出される既存問題のため対象外)
- [ ] 7.4 翔太郎くんへの動作確認案内 (`verify-locally` Skill で `/reservations/:id` + `/profile` モーダル + `/privacy` を網羅して提示)
- [ ] 7.5 PR 作成 + Render Preview 確認 (Preview は prd Supabase 向き → prd に migration を別途 push しないと参加者 RPC が 404 になる点を Test Plan に明記)

## 8. UI レビューフィードバック対応 (2026-06-11)

- [x] 8.1 nickname 未設定者の表示を「参加メンバー」→「ニックネーム未設定」(text-muted グレーアウト) に変更。本物の nickname (text-ink) とスタイルで区別
- [x] 8.2 末尾の「同伴者 +N 名」集約サマリを廃止し、予約者本人の行に「＋同伴N名」を付与 (Meta テーブル「同伴者」との同一語二重使用を解消)
- [x] 8.3 見出しを「参加者 N名」とし、N は描画配列 (行数 + guest_count 合算) から算出 → リストとの整合をロジックで保証
- [x] 8.4 リスト密度改善: text-base → text-sm、gap → 罫線区切り (divide-y divide-hairline)。「あなた」バッジ位置は維持
- [x] 8.5 エッジケース: 長い nickname (DB 上限 15 文字) の折り返し / 10 名超の折りたたみ「すべて表示（あとN名）」/ 自分 1 人だけ時の補足文
- [x] 8.6 プライバシーポリシー本文の汎用表記例も「ニックネーム未設定」に同期。spec delta (reservation-detail-page / privacy-policy-page) 更新
- [x] 8.7 「あなた」バッジの縦 padding を除去し全行の行高を統一 (text-sm 行高 20px 以内に収める)
- [x] 8.8 「すべて表示（あとN名）」を本文色 + シェブロンアイコン + min-h-[44px] タップ領域に変更 (「ニックネーム未設定」のグレーアウトと区別)
