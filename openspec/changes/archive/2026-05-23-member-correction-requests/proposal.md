## Why

実運用で「会員プロフィールの一部だけが不正確で、運営から訂正してもらいたい」ケースが発生している（生年月日が本人確認書類と不一致 / 日本人会員が氏名をローマ字登録 など）。既存の `identity-document-reject` フローはアクションが重く（status を rejected に変更 + 既存予約を一括キャンセル）、データだけ直してほしい場面には過剰。`mailto:` リンクによる admin 手動メールも、admin の押し忘れ + 会員のメール無視で確認できないリスクがある。

軽量に「特定 field の修正をお願いする」動線を入れ、予約を維持したまま会員ログイン時に必ず目に入る形で通知し、会員が修正したら自動で要請が消える仕組みが必要（Issue #296）。

## What Changes

- **admin の運営機能として「修正依頼」を新設**。admin が会員詳細画面から「修正してほしい属性」と理由文を投稿できる
- 会員データに「未対応の修正依頼一覧」を保持する。既存の `members.profile` jsonb 列を拡張する形（テーブル追加なし）
- **会員サイトのログイン直後の画面に警告バナー** を表示し、依頼内容と該当属性の編集動線を見せる
- バナーから該当属性の編集モーダルを直接開けるようにする
- 会員がその属性を更新したら、対応する修正依頼は **自動的に消える**（admin の手動承認は不要）
- admin 側は **会員一覧で「修正依頼中」の状態が一目で分かる** ようにする。admin が修正依頼を **取り下げる** こともできる
- **予約はキャンセルしない**（既存予約のエンゲージメントを保つ）
- 修正依頼の文面は admin が **自由文** で書く。属性ごとの自動判定（漢字/かな / 値の検証 等）は MVP1 では入れない

### 明示的に対象外（非ゴール）

- 修正依頼作成時のメール通知 — Phase 2 で「未対応 N 日後にリマインドメール」とまとめて Edge Function 化
- SMS / push 通知
- 修正依頼の履歴管理（過去の依頼の閲覧 / 監査ログ） — MVP1 では「未対応リスト」のみ持つ
- ニックネーム / 経験レベル など admin 業務に直接影響しない属性の修正依頼を制限する仕組み — admin の運営判断に委ねる

## Capabilities

### New Capabilities

- `member-correction-requests`: 会員プロフィールに対する「修正依頼」の作成・通知・自動消化のドメインを規定する。admin の作成・取り下げ動線、会員側の表示・編集連携、データ構造、自動消化ルールを定義する

### Modified Capabilities

- `data-schema`: `members.profile` jsonb 列の利用キーとして `correction_requests` 配列を追加することを明記する
- `reservation-profile-page`: 各属性の編集モーダル完了時に、対応する `correction_requests` エントリを同時に削除することを定義する
- `admin-members-list`: 会員一覧 / 詳細 sheet に「修正依頼中」状態の表示・作成・取り下げ動線を追加する

## Impact

- DB: 列追加なし（既存 `members.profile` jsonb を拡張運用するのみ）
- spec: 新規 `member-correction-requests` capability、および上記 3 spec の MODIFIED
- admin: 会員詳細 sheet に修正依頼の作成・一覧・取り下げ UI を追加、会員一覧にバッジ表示
- reservation: 認証済ホーム画面上部の警告バナー、`/profile` への該当属性編集モーダル誘導、各属性更新 mutation での自動削除ロジック
- entities/member: `Member` 型に `correctionRequests` 配列を追加
- 関連 Issue: #293（書類未提出バッジ）と admin 一覧バッジの並存設計を意識する
