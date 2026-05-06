## 1. ルーティング & ページ雛形

- [x] 1.1 `apps/reservation/src/pages/ProfilePage.vue` を雛形（HQ paper 背景 + TopBar + 空コンテナ）で作成
- [x] 1.2 `apps/reservation/src/app/router.ts` に `path: '/profile'` / `name: 'profile'` を追加（`meta.public` なし）
- [x] 1.3 `apps/reservation/src/app/router.spec.ts` で「未認証 → /login」「未完成 → /signup/profile」「書類未提出 → /signup/identity」「全完了 → ProfilePage 描画」の 4 ルートガードシナリオを追加
- [x] 1.4 `widgets/page-breadcrumb/PageBreadcrumb` を ProfilePage の header に 1 箇所のみ配置（パンくず: Workspace > プロフィール）

## 2. ヘッダ Widget

- [x] 2.1 `apps/reservation/src/widgets/profile-header/ProfileHeader.vue` を新設（アバター + 表示名 + メール + ID 表示）
- [x] 2.2 表示名は reservation-member-auth の名前優先ルール（`nickname ?? display_name`）で導出するヘルパ `resolveMemberDisplayName(member)` を `apps/reservation/src/entities/member/lib/` に追加し、ユニットテストを書く
- [x] 2.3 アバターイニシャル（先頭 1 文字）は `resolveMemberDisplayName` の値から取得し、HQ accentSoft 背景 + accent 文字色で描画
- [x] 2.4 ID 表示は `members.id` の末尾 4 文字を大文字英数で `ID · XXXX` 形式に整形するヘルパ `formatMemberShortId(memberId)` を追加し、ユニットテストを書く
- [x] 2.5 ProfilePage に ProfileHeader を組み込み、`useAuthSession.member` を渡す

## 3. LEVEL セクション（経験レベル変更）

- [x] 3.1 `apps/reservation/src/features/profile-level-edit/` を新設（`useLevelEdit.ts` + `LevelEditSection.vue`）
- [x] 3.2 `useLevelEdit` で 3 択ラジオの選択 → `supabase.from('members').update({ experience_level }).eq('id', auth.uid())` → `useAuthSession.refresh()` の即時保存ロジックを実装。Smart constructor `createExperienceLevel` を経由する
- [x] 3.3 `useLevelEdit.spec.ts` で「成功で UPDATE 発行」「失敗時にロールバック」「enum 外で例外」の 3 シナリオをテスト
- [x] 3.4 `LevelEditSection.vue` でデザインサンプル `ScreenRProfile` の LEVEL UI（kicker + 説明文 + 3 ラジオカード + サブテキスト）を実装
- [x] 3.5 ProfilePage に LevelEditSection を組み込む

## 4. STATS セクション + 予約履歴データ取得

- [x] 4.1 `apps/reservation/src/entities/reservation/api/fetchMyReservations.ts` を新設し、`reservations × events × venues` JOIN で自分の予約を `start_at DESC` 順に取得する関数を実装
- [x] 4.2 `fetchMyReservations.spec.ts` で「自分の行のみ返る（RLS）」「JOIN フィールドが揃う」「降順ソート」をテスト
- [x] 4.3 `apps/reservation/src/features/profile-stats/lib/computeStats.ts` を新設し、予約配列から `attendedCount` / `lastAttendedAt` / `nextUpcoming` を算出する pure function を実装
- [x] 4.4 `computeStats.spec.ts` で「3 件 attended / 2 件 reserved 未来 / 1 件 cancelled」「0 件」「reserved だが過去（次回予定から除外）」の集計シナリオをテスト
- [x] 4.5 `apps/reservation/src/features/profile-stats/StatsSection.vue` で kicker + 数値 3 行 + 履歴一覧（開催日 / イベント名 / 状態バッジ）を実装。Empty 時は「まだ参加履歴がありません」表示
- [x] 4.6 状態バッジコンポーネント `apps/reservation/src/features/profile-stats/ui/ReservationStatusBadge.vue` で 5 種ステータス（reserved / attended / cancelled / no_show / waitlist）の表示ラベルを切り替え
- [x] 4.7 ProfilePage で `fetchMyReservations` を呼び、StatsSection に渡す

## 5. キャンセル動線（履歴一覧から）

- [x] 5.1 既存 `apps/reservation/src/features/booking/` のキャンセル UPDATE ロジックを `cancelReservation(reservationId)` として共通化（reservation-booking-flow と兼用）
- [x] 5.2 `cancelReservation.spec.ts` で「成功で status=cancelled」「他人の予約は RLS で失敗」「開始済イベントはアプリ層でも弾く」をテスト
- [x] 5.3 履歴一覧の各行で `status='reserved'` AND `events.start_at > now()` の予約にキャンセルボタンを表示
- [x] 5.4 ConfirmDialog（shadcn-vue Dialog 流用）→ 確定で `cancelReservation` 呼び出し → 対象行をローカルで `status='cancelled'` に書き換え + 完了トースト
- [x] 5.5 開催開始以降の予約はキャンセルボタン非表示（DOM 上に存在しない）
- [x] 5.6 キャンセル後 STATS の「次回予定」が再計算されることを確認

## 6. ACCOUNT セクション（表示）

- [x] 6.1 `apps/reservation/src/features/profile-account/AccountSection.vue` を新設し、お名前 / ニックネーム / メール / 電話番号 の 4 行を表示（生年月日は描画しない）
- [x] 6.2 ニックネーム未設定（NULL）時は「未設定」を灰色表示
- [x] 6.3 各行右端に「編集」リンク（モーダル起動トリガ）を配置
- [x] 6.4 ProfilePage に AccountSection を組み込む

## 7. 編集モーダル群（shadcn-vue Dialog ベース）

- [x] 7.1 `apps/reservation/src/features/profile-account/ui/DisplayNameEditDialog.vue` 実装（display_name UPDATE / 空欄エラー）
- [x] 7.2 `apps/reservation/src/features/profile-account/ui/NicknameEditDialog.vue` 実装（nickname UPDATE + 「クリア」ボタン + 空文字 → NULL 化 + 文字種/文字数バリデーション）
- [x] 7.3 `NicknameEditDialog.spec.ts` で「新規設定」「クリアボタン」「空文字保存で NULL」「文字種違反」「文字数違反」の 5 シナリオをテスト
- [x] 7.4 `apps/reservation/src/features/profile-account/ui/PhoneEditDialog.vue` 実装（`createPhone()` 経由の正規化保存 / 固定電話/桁数不足のエラー）
- [x] 7.5 `PhoneEditDialog.spec.ts` で「区切りなし正規化」「固定電話拒否」「桁数不足」をテスト
- [x] 7.6 `apps/reservation/src/features/profile-account/ui/EmailEditDialog.vue` 実装。`supabase.auth.updateUser({ email })` 呼び出し → Success 状態で「確認メール送信済み」表示（モーダルは閉じない）
- [x] 7.7 `EmailEditDialog.spec.ts` で「成功で送信完了表示」「形式不正エラー」「現在のメールと同一エラー」「rate-limit エラー」「members.email は即時更新されない」の 5 シナリオをテスト
- [x] 7.8 各モーダルを AccountSection の編集リンクから起動

## 8. ログアウト動線

- [ ] 8.1 `apps/reservation/src/features/profile-sign-out/SignOutButton.vue` 実装（画面下部の outline ボタン + ConfirmDialog）
- [ ] 8.2 確定で `useAuthSession.signOut()` → `router.push({ name: 'login' })`
- [ ] 8.3 ProfilePage の最下部に SignOutButton を配置

## 9. 4 状態 + a11y + デザイントークン仕上げ

- [ ] 9.1 ProfilePage 初期ロード時に Loading skeleton を表示（ヘッダ / 各セクション領域）
- [ ] 9.2 取得失敗時に画面上部 Error バナー + 「再試行」CTA を表示
- [ ] 9.3 すべての色 / spacing / radius が `var(--hq-*)` または Tailwind preset utility 経由になっていることを grep で確認（マジックナンバーゼロ）
- [ ] 9.4 すべてのインタラクティブ要素にラベル / aria 属性が付与されていることを確認
- [ ] 9.5 390x844 viewport（iPhone）で横スクロールなしで描画されることを Playwright で確認

## 10. spec 反映 (Sync)

- [ ] 10.1 `openspec/specs/reservation-profile-page/spec.md` を本 change の specs から生成（`/opsx:sync` で自動）
- [ ] 10.2 `openspec/specs/reservation-booking-flow/spec.md` のキャンセル要件を modification 内容で更新（`/opsx:sync` で自動）
- [ ] 10.3 `openspec/specs/reservation-member-auth/spec.md` のログアウト要件を modification 内容で更新（`/opsx:sync` で自動）

## 11. E2E + 最終確認

- [ ] 11.1 `apps/reservation/tests/e2e/profile-happy-path.spec.ts` を作成し、「経験レベル変更 → 履歴から未来予約 1 件キャンセル → ログアウト」の 1 シナリオを実装
- [ ] 11.2 `pnpm --filter @high-q/reservation exec vitest run` で全ユニット/component test を一括実行し、green を確認
- [ ] 11.3 `pnpm --filter @high-q/reservation build` でビルド成功を確認
- [ ] 11.4 `pnpm --filter @high-q/reservation dev` で起動し、390px ブラウザ表示で全セクションを目視確認（経験レベル / アカウント編集 4 種 / 履歴 / キャンセル / ログアウト）
