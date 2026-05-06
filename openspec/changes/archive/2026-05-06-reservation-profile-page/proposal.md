## Why

会員サイトの予約導線（ログイン → 予約 → 完了 → キャンセル）は揃ったが、会員自身が**自分の経験レベルを変える / 自分のアカウント情報を更新する / 過去と未来の予約を一覧する**ための窓口がない。現状キャンセル動線は予約完了画面にしか存在しないため、過去に予約済みのイベントを後からキャンセルしたい場合、会員は完了メールも持たずたどり着けない。Epic #170「メンバーが High Q に参加し、繰り返す」のジャーニー後半（管理する → 繰り返す）を成立させるには、リピート利用の起点となるプロフィール画面が必須。

## What Changes

- 会員サイト (`apps/reservation`) に**プロフィール画面 (`/profile`)** を新設し、認証済み + プロフィール完成 + 本人確認書類提出済の会員のみアクセス可能にする
- 画面は**ヘッダ + 3 セクション (LEVEL / ACCOUNT / STATS) + ログアウト**で構成（Issue #91 の NOTIFY セクションは MVP2 に押し下げ）
- ヘッダはアバター（イニシャル）+ 表示名（ニックネーム > 氏名 の優先表示・#209 ルールに従う）+ メール + ID（members.id 末尾 4 文字）
- LEVEL セクションで経験レベル（初めて / 中級 / 経験者）を即時保存変更
- ACCOUNT セクションで**氏名 / メール / 電話番号 / ニックネーム**を編集可能（生年月日は表示しない・デザインサンプル準拠）。メール変更は Supabase Auth `updateUser` + 再 OTP 確認フロー
- STATS セクションで**累計参加回数 / 最終参加日 / 次回予定**を表示し、過去・未来の予約履歴一覧を見せる。各履歴行はキャンセル可能なものに「キャンセル」ボタンを併置（reservation-booking-flow と同じ判定: `events.start_at > now()`）
- 画面下部からログアウトできる
- 既存 reservation-booking-flow spec の制約「キャンセル動線はプロフィール画面 #91 への展開は MVP2」を**解除**（本 change で MVP1 内に取り込む）
- 4 状態（Loading / Empty / Error / Success）対応 + RLS で他人の members / reservations にアクセスできないこと
- E2E は **happy path 1 件**（経験レベル変更 → 予約履歴からキャンセル → ログアウト）に絞る

## Capabilities

### New Capabilities
- `reservation-profile-page`: 会員サイトのプロフィール画面 (`/profile`) — 経験レベル変更 / アカウント情報編集 / 予約履歴閲覧 + キャンセル / ログアウト を 1 画面に集約する

### Modified Capabilities
- `reservation-booking-flow`: キャンセル動線をプロフィール画面にも展開（MVP1 内）。完了画面のみだった集約方針を解除し、履歴からの再キャンセルを許容する
- `reservation-member-auth`: ログアウト UI の所在を HomePlaceholder からプロフィール画面に移動（HomePlaceholder は既に廃止済 / `/` は events-list にリダイレクト済のため、ログアウト動線の主入口を再定義する）

## Impact

- **Code**:
  - 新規 page: `apps/reservation/src/pages/ProfilePage.vue`
  - 新規 features: `apps/reservation/src/features/profile/` （level-edit / account-edit / reservation-history / sign-out）
  - ルーター追加: `/profile`（auth + profile-complete + identity-document guard 既存の流れに乗せる）
  - 共有 UI: shadcn-vue の Dialog を再利用（編集モーダル）。新規プリミティブ追加なし
- **DB / RLS**: 既存テーブルのみ使用（members / reservations / events / venues）。スキーマ変更なし。RLS は既存ポリシーで十分（自分の行のみ SELECT/UPDATE）
- **Auth**: メール変更は `supabase.auth.updateUser({ email })` を呼び、Supabase 側の確認メール送信に従う。members.email は同期トリガーで更新
- **依存**: なし（既存パッケージで完結）
- **影響を受ける spec**: `reservation-booking-flow`（キャンセル動線の追加経路）/ `reservation-member-auth`（ログアウト UI 所在）
