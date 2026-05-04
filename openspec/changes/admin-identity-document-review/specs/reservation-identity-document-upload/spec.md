## MODIFIED Requirements

### Requirement: AuthSession に `hasIdentityDocument` 派生プロパティが存在する

`useAuthSession` の戻り値型 `AuthSession` に `hasIdentityDocument: ComputedRef<boolean>` を MUST 含める。`evaluate()` 実行時に `members` 取得と並行 (Promise.all 等) で `select id from identity_documents where member_id = ? and status in ('pending', 'approved') limit 1` を実行し、行が 1 件以上あれば `true`、0 件なら `false` を保持する SHALL。`refresh()` で再評価される。

判定ロジックの本質は「**有効な (pending または approved) 提出物が 1 件でも存在するか**」である。`status = 'rejected'` の行は **無効な提出物** として除外 SHALL。これにより、admin に差し戻された (rejected 化された) member は再度 `hasIdentityDocument === false` 扱いとなり、auth guard で `/signup/identity` への再提出フローへ強制誘導される。

#### Scenario: 未提出会員の取得
- **WHEN** 書類を 1 件も提出していない会員が `useAuthSession.ready()` を呼ぶ
- **THEN** `hasIdentityDocument.value === false` となる

#### Scenario: pending 会員の取得
- **WHEN** `identity_documents` に `status = 'pending'` の行が 1 件以上ある会員が `useAuthSession.ready()` を呼ぶ
- **THEN** `hasIdentityDocument.value === true` となる (pending は admin レビュー待ちの有効な提出物として扱う)

#### Scenario: approved 会員の取得
- **WHEN** `identity_documents` に `status = 'approved'` の行が 1 件以上ある会員が `useAuthSession.ready()` を呼ぶ
- **THEN** `hasIdentityDocument.value === true` となる

#### Scenario: rejected のみ持つ会員の取得
- **WHEN** `identity_documents` に `status = 'rejected'` の行のみ持つ会員が `useAuthSession.ready()` を呼ぶ
- **THEN** `hasIdentityDocument.value === false` となる (rejected 行は無効な提出物として除外)

#### Scenario: pending と rejected を混在で持つ会員
- **WHEN** `identity_documents` に `status = 'rejected'` の旧行 + `status = 'pending'` の新行を持つ会員が `useAuthSession.ready()` を呼ぶ
- **THEN** `hasIdentityDocument.value === true` となる (有効な pending 行が 1 件以上あるため、rejected 行の存在は判定に影響しない)

#### Scenario: アップロード成功後の refresh
- **WHEN** 書類アップロード成功直後に `useAuthSession.refresh()` が呼ばれる
- **THEN** `hasIdentityDocument` が `true` に更新される (新規 pending 行が追加されたため)

#### Scenario: admin 差し戻し直後の reservation 側 refresh
- **WHEN** admin が member の唯一の identity_documents (`status='pending'`) を差し戻して `'rejected'` に UPDATE 後、reservation 側 member が再ログインまたは `useAuthSession.refresh()` を呼ぶ
- **THEN** `hasIdentityDocument.value === false` に更新され、router guard により `/signup/identity` へ強制誘導される

### Requirement: プロフィール完成済 + 書類未提出会員の `/signup/identity` 強制誘導

認証済 + `isProfileComplete === true` + `hasIdentityDocument === false` の会員が `/signup/identity` 以外のルートにアクセスした場合、auth guard により `/signup/identity` に MUST リダイレクトする。`/signup/identity` 自体および `/auth/callback` へのアクセスは通過する SHALL。

`hasIdentityDocument === false` の判定対象には以下の **両方** を MUST 含める:
- 書類を 1 件も提出していない (新規未提出) 会員
- 過去の提出が admin に差し戻され、現状 `status = 'rejected'` の行のみ持つ (再提出待ち) 会員

これにより、admin の差し戻し / マスク漏れ削除 (admin-identity-document-review capability の連鎖予約キャンセル mutation 後) を受けた member は、次回ログインまたは画面遷移時に自動的に `/signup/identity` の再提出フローへ復帰する SHALL。

#### Scenario: 書類未提出で `/` にアクセス
- **WHEN** 認証済 + プロフィール完成 + 書類未提出 (0 件) のユーザーが `/` にアクセス
- **THEN** `/signup/identity` にリダイレクトされる

#### Scenario: rejected のみ持つ会員で `/` にアクセス
- **WHEN** 認証済 + プロフィール完成 + `status='rejected'` 1 件のみ持つユーザーが `/` にアクセス
- **THEN** `/signup/identity` にリダイレクトされる (再提出フローに復帰)

#### Scenario: pending を持つ会員で `/` にアクセス
- **WHEN** 認証済 + プロフィール完成 + `status='pending'` 1 件以上持つユーザーが `/` にアクセス
- **THEN** リダイレクトされず、`/` (ホーム) が描画される (pending は予約可能な有効状態)

#### Scenario: approved を持つ会員で `/` にアクセス
- **WHEN** 認証済 + プロフィール完成 + `status='approved'` 1 件以上持つユーザーが `/` にアクセス
- **THEN** リダイレクトされず、`/` (ホーム) が描画される

#### Scenario: 書類未提出で `/signup/identity` にアクセス
- **WHEN** 認証済 + プロフィール完成 + 書類未提出のユーザーが `/signup/identity` にアクセス
- **THEN** `/signup/identity` のフォームが描画される (無限ループしない)

#### Scenario: rejected のみ持つ会員で `/signup/identity` にアクセス
- **WHEN** 認証済 + プロフィール完成 + rejected のみ持つユーザーが `/signup/identity` にアクセス
- **THEN** `/signup/identity` のフォームが描画される (無限ループしない、再提出可能)

#### Scenario: pending 提出済 + `/signup/identity` 直リン
- **WHEN** 認証済 + プロフィール完成 + pending 1 件以上持つユーザーが `/signup/identity` に直接アクセス
- **THEN** `/` (ホーム) にリダイレクトされる (再提出済みのため)

#### Scenario: approved 提出済 + `/signup/identity` 直リン
- **WHEN** 認証済 + プロフィール完成 + approved 1 件以上持つユーザーが `/signup/identity` に直接アクセス
- **THEN** `/` (ホーム) にリダイレクトされる
