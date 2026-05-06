## Context

会員サイト (`apps/reservation`) は現在、以下の認証済みページを持つ:

- `/events`（一覧）/ `/events/:id`（詳細）/ `/events/:id/book/done`（予約完了）
- `/login` / `/auth/link-sent` / `/auth/callback`（認証フロー）
- `/signup/profile`（会員登録段階 2）/ `/signup/identity`（会員登録段階 3）

ログアウト動線は元々 HomePlaceholder にあったが、HomePlaceholder は #90 で廃止済み。`/` は `events-list` にリダイレクトされ、ログアウト動線の置き場が定まらないまま放置されている。

予約のキャンセルは予約完了画面 (`booking-done`) からのみ可能で、予約済イベントへの後追いキャンセル動線が欠落している。reservation-booking-flow spec はこの制約を「プロフィール画面 #91 への展開は MVP2」として一時的に許容していた。

本 change はこの 2 点（ログアウト所在 / 後追いキャンセル）を**プロフィール画面という単一の出入口に集約**することで解消し、Epic #170 のジャーニー後半（管理する → 繰り返す）を成立させる。

## Goals / Non-Goals

**Goals:**

- 会員 1 人のプロフィール画面を `/profile` に新設
- 経験レベル変更を本画面に集約（即時保存）
- アカウント情報（氏名 / メール / 電話番号 / ニックネーム）を各行モーダル編集
- 予約履歴一覧（過去 + 未来）と、未開催イベントのキャンセル動線
- ログアウトを本画面の唯一の主入口にする
- 4 状態（Loading / Empty / Error / Success）対応
- E2E happy path 1 件（経験レベル変更 → 履歴からキャンセル → ログアウト）

**Non-Goals:**

- NOTIFY セクション（通知設定）→ MVP2 押し下げ
- 生年月日の表示・編集 → デザインサンプル準拠で非表示
- メール通知の送受信 → 既存方針通り MVP2
- admin 画面側のログアウト動線 → 本 change のスコープ外
- members テーブルの列追加 → 既存スキーマで完結
- 過去予約への「再予約」「リピート」アクション → MVP2

## Decisions

### Decision 1: ルートを `/profile` に新設し、既存 guard チェーンに合流させる

**選択**: 既存の auth guard が「未認証 → `/login`」「プロフィール未完成 → `/signup/profile`」「書類未提出 → `/signup/identity`」と段階チェック済み。本画面は最終段階の「すべて完了」会員のみアクセス可能とし、既存 guard をそのまま通過させる。

**代替案**: `/me` / `/account` / `/settings` 等の URL も検討したが、デザインサンプルが「プロフィール」を表題とし、Issue 本文も「プロフィール画面」と呼んでいるため `/profile` に揃える。

### Decision 2: ヘッダの表示名は「ニックネーム > 氏名」優先（#209 ルール）

reservation-member-auth spec に既に定義された **会員視点表示の名前優先ルール** を本画面のヘッダ大見出し / アバターイニシャルで適用する。アカウント情報セクションでは「ニックネーム」と「お名前 (display_name)」を別行として両方表示し、編集時の対応関係を明確にする。

### Decision 3: アカウント情報編集はモーダル方式（shadcn-vue Dialog）

各行の「編集」リンク押下で Dialog を開き、当該フィールドのみ編集する。インライン編集（同一行内で `<input>` に変身）を採用しないのは、フォームバリデーション・キャンセル UX・スクロール位置の保持を一貫させるため。Dialog プリミティブは既存 shadcn-vue 取り込み済み。

メール変更モーダルは特殊扱い:

1. 新メール入力 → `supabase.auth.updateUser({ email: newEmail })` 呼び出し
2. Supabase が新メールに確認リンクを送る（既存の `emailRedirectTo` 設定を使用）
3. モーダル内で「確認メールを送信しました。新しいアドレスのリンクから確認してください」を表示し、Modal 自体は閉じない（戻るボタンで閉じる）
4. 確認完了は別タブのリンククリックで非同期に発生し、次回 `useAuthSession.refresh()` 時に `members.email` も同期される（Supabase の auth → members 同期トリガーが既に存在）

### Decision 4: 予約履歴のクエリ戦略

`reservations` × `events` × `venues` を JOIN し、自分の予約のみを取得する。並び順は `events.start_at DESC`（最新→過去）とし、未来の予約はリストの先頭に集約する:

```sql
SELECT r.id, r.status, r.guest_count, r.cancelled_at,
       e.id as event_id, e.title, e.start_at, e.end_at, e.fee, v.name as venue_name
FROM reservations r
JOIN events e ON e.id = r.event_id
JOIN venues v ON v.id = e.venue_id
WHERE r.member_id = auth.uid()
ORDER BY e.start_at DESC;
```

RLS により `member_id = auth.uid()` 条件は冗長だが、明示的に書くことで RLS 失敗時の安全性を担保する。

### Decision 5: STATS の集計はクライアント側 reduce

累計参加回数 / 最終参加日 / 次回予定 は、Decision 4 で取得した予約配列から JS で算出する。view 経由（`event_participants_view`）を使わない理由:

- view は admin 視点（イベント単位での参加者横並び）で、会員自身の縦串集計には向かない
- 配列は予約一覧表示と兼用するため、追加クエリを発行せずに済む
- 集計ロジック: `attended = list.filter(r => r.status === 'attended').length` / `lastAttended = max(start_at where status === 'attended')` / `nextUpcoming = min(start_at where status === 'reserved' AND start_at > now())`

### Decision 6: キャンセル可否判定は `events.start_at > now()` のみ（既存 spec 踏襲）

reservation-booking-flow spec の判定基準をそのまま使用。`events.cancel_deadline` 列は MVP1 で未参照のまま据え置く。キャンセル不可時は LINE オープンチャットへの誘導文言を表示し、外部 URL は既存の `shared/lib/contact-channels` 定数を流用する。

### Decision 7: ログアウトは確認ダイアログを挟む

誤押下防止のため、ConfirmDialog で「ログアウトしますか？」を経由させる。`useAuthSession.signOut()` 呼び出し後 `/login` へ `router.push`。

### Decision 8: 4 状態の表現

- **Loading**: 初回ロード時はヘッダ + 各セクションをスケルトン表示（既存 `LoadingState` widget 系統があれば再利用、なければシンプルな skeleton で代替）
- **Empty**: 予約履歴 0 件のときは STATS の数値部分を「— 回 / —」、履歴一覧領域は「まだ参加履歴がありません」を kicker 風に表示
- **Error**: 取得失敗時は画面上部に Error バナー + 再取得 CTA。編集モーダル内は inline error
- **Success**: 取得成功時 = 通常表示

### Decision 9: E2E スコープの上限遵守

CLAUDE.md「機能あたり 1〜2 件まで」のガードレールおよび既存 reservation-identity-document-upload (#92) のスケーラビリティ運用パターンに従い、**E2E は 1 件のみ**:

> 未認証ユーザーが `/profile` に直接アクセスすると `/login` にリダイレクトされる (auth guard 統合)

経験レベル変更 / アカウント編集 4 種 / 履歴キャンセル / ログアウト等の happy path 検証は、認証済セッションを E2E で再現するコストが高い (member / identity_documents / reservations の全 supabase レスポンスを mock する必要) ため、component test + unit test に押し下げる。本実装では vitest 51 ファイル / 389 ケースで挙動を完全にカバーしている。

## Risks / Trade-offs

- **メール変更フローの非同期性**: Supabase 確認リンク完了は別タブで起き、即時 UI 反映されない → モーダル内で「確認メール送信済み」の Success 状態を明示し、次回 `refresh()` で同期される旨を説明文で補足
- **キャンセル後の表示更新**: キャンセル成功直後に履歴一覧を再取得しないと古い `status='reserved'` が残る → `cancel` 成功で履歴を再 fetch するか、対象行をローカルで `status='cancelled'` に書き換える（後者を採用してネットワーク往復を削る）
- **ニックネーム NULL の編集 UX**: 「未設定 → 設定」と「設定 → 未設定（NULL に戻す）」を両方扱う必要 → モーダルに「ニックネームをクリア」ボタンを併置し、空文字で送信したら NULL に変換する
- **STATS の集計精度**: `attended` ステータスは admin 側で当日チェックイン後に手動更新する想定 → MVP1 段階では大半のレコードが `reserved` のまま残るため、累計参加回数が 0 のまま見える可能性がある。Empty 状態文言を慎重に書く
- **ログアウト導線の冗長性**: 既存 `/signup/profile` / `/signup/identity` にもログアウトリンクがあり、本画面追加で重複する → 既存ページのログアウトは「登録途中の離脱」用として維持、本画面のログアウトは「正規会員の主入口」として位置付け、両者を併存させる

## Migration Plan

DB マイグレーション・破壊的変更なし。デプロイは通常の PR マージで完了する。reservation-booking-flow spec の制約「プロフィール画面 #91 への展開は MVP2」を解除する modification は本 change の specs delta として扱う。
