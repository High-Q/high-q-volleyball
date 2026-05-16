## Why

会員の「退会」を実現する手段が現在の High Q プラットフォームには一切存在せず、運用上 2 つの問題が顕在化している:

1. **個人情報保護方針との約束違反リスク**: privacy-policy-page で「退会時は会員データ（本人確認書類画像を含む）を削除」と公開済みだが、その UI も削除フローも未実装で、退会要望が来ても運営が手動で DB / Storage / auth.users を操作するしかない。
2. **問題行動会員への対処手段が手動運用**: 迷惑行為会員などをサークルから外したい場合に、admin が画面から完結できる手段がなく、運営の業務継続性に支障が出る。

会員自身による自己退会（#254）と admin による強制削除（#255）は、削除セマンティクス（reservations / identity_documents / Storage / auth.users の扱い）が完全に共通であるため、別々に設計するとブレが生じる。1 つの change で削除セマンティクスを 1 か所に決め、UI 2 系統を同じ基盤に乗せる。

## What Changes

- **会員データ削除セマンティクスを確立する**: 「退会」をシステム全体で 1 通りの意味に固定する。本人確認書類画像と Auth アカウントは物理削除し、過去の参加履歴は匿名化された痕跡として残す方針を採る（過去予約集計の歴史的整合性と、個人情報保護方針の「会員データ削除」約束の両立）。
- **会員自身の退会 UI（reservation アプリ）**: プロフィール画面に「アカウント削除」セクションを追加し、確認 dialog を経て自己退会できる動線を提供する。
- **admin 主導の強制削除 UI（admin アプリ）**: 会員詳細 sheet に「危険な操作」セクションを追加し、メールアドレス再入力による二重確認で会員を強制削除できる動線を提供する。
- **削除実行は Edge Function に集約する**: Auth アカウント削除 / Storage オブジェクト削除 / DB 行削除を 1 つの Edge Function 内でトランザクション的に実行し、reservation / admin の両クライアントから呼び出す。
- **退会時の予約・履歴の扱いを規定する**: 未来予約は退会前に強制キャンセル扱い、過去予約は member 参照を匿名化したまま残し、集計 view から「退会済み会員」を除外する閾値を明文化する。
- **個人情報保護方針の Scenario を退会フロー実装と整合させる**: 「退会時に削除される対象」と「履歴として残る対象」を spec の Scenario として固定する。
- **BREAKING**（DB スキーマ）: `reservations.member_id` の FK 動作を変更し、member 削除時に過去予約を孤児化（匿名化）させる経路を新設する。

## Capabilities

### New Capabilities
- `member-withdrawal`: 会員退会の意味論（何を削除し / 何を残し / 誰が実行できるか）を 1 か所で規定する基盤 capability。reservation 側 UI / admin 側 UI / Edge Function / DB 整合性ルールがこの capability の Requirement を共通の契約として参照する。

### Modified Capabilities
- `data-schema`: 退会後の過去予約の取り扱いに合わせ、`members` 削除時の参照整合性ルールおよび集計 view の集計対象範囲を改定する。
- `rls-policies`: `members` および関連テーブルの DELETE ポリシー（本人 / admin / Edge Function 経由）を追加し、退会経路の認可を明文化する。
- `admin-members-list`: 詳細 sheet に「危険な操作」セクションを追加し、admin が会員を強制削除できる動線・確認フロー・成功後の一覧更新挙動を規定する。
- `reservation-profile-page`: プロフィール画面に「アカウント削除」セクションを追加し、自己退会の動線・確認フロー・完了後の遷移を規定する。
- `reservation-member-auth`: 退会した会員のログイン経路（マジックリンク不発行 / 既存セッション無効化）を規定する。
- `privacy-policy-page`: 「退会時の削除対象 / 履歴として残る対象」の Scenario を実装に整合する形で精緻化する。

## Impact

- **DB スキーマ**: `reservations.member_id` の FK 動作変更に伴うマイグレーションが必要。既存集計 view（`member_list_view` / `member_history_view` / `event_participants_view` 等）の集計対象を「退会済み会員を除く / 含む」観点で見直す。
- **Edge Function**: 新規 Function（会員削除）を追加。`service_role` 権限で Auth admin API / Storage / DB を直接操作する。
- **RLS**: `members` / `identity_documents` / `reservations` の DELETE 系ポリシーを追加・調整。
- **UI**: `apps/reservation/src/pages/ProfilePage` および `apps/admin/src/widgets/member-detail-sheet` に削除セクション・確認 dialog を追加。
- **個人情報保護方針 / SOP**: privacy-policy-page と `docs/06-品質・セキュリティ/06-個人情報保護方針.md` / `08-本人確認書類取扱SOP.md` の「退会時」記述との整合を最終確認する。
- **テスト**: 削除セマンティクスの DB 整合性テスト / Edge Function 単体テスト / E2E ハッピーパス（自己退会・admin 強制削除）を追加。
- **クローズ予定 Issue**: #254（reservation 自己退会）, #255（admin 強制削除）。
