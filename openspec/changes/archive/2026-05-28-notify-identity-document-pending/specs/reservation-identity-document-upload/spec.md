## ADDED Requirements

### Requirement: アップロード成功時にオーナー通知 Edge Function を fire-and-forget で発火する

`features/identity-document/composables/useUploadIdentityDocument.ts` の `submit(...)` は MUST 最終 `storage_path` UPDATE が成功し `{ ok: true, value: <IdentityDocumentId> }` を返す直前で、オーナー通知 Edge Function (`send-identity-document-pending-notification`) を `void` で呼び出す SHALL。

呼び出し方は MUST 以下を満たす:

- `await` しない (fire-and-forget)
- 呼び出し失敗 / Edge Function の `{ ok: false }` レスポンス / セッション欠落のいずれも `submit()` の成功判定を覆さない
- 失敗ケースは `console.warn` に相関情報 (identityDocumentId / 失敗理由) を残す
- UI 側はオーナー通知の成否に関わらず upload 成功表示 (緑バナー → ホーム CTA) を描画する

`submit()` が `{ ok: false, error: 'storage_failed_*' }` / `{ ok: false, error: 'db_failed' }` を返すロールバック分岐では Edge Function を MUST NOT 呼び出す (pending 行が削除されているため通知意味なし)。

#### Scenario: happy path で trigger 発火
- **WHEN** ユーザーが表面のみで upload に成功し `submit()` が `{ ok: true }` を返す
- **THEN** `send-identity-document-pending-notification` Edge Function が `{ identityDocumentId }` payload で 1 回呼ばれる

#### Scenario: 表裏両方成功時の trigger 発火
- **WHEN** 表裏両方で upload に成功
- **THEN** Edge Function が `{ identityDocumentId }` payload で 1 回呼ばれる (表裏で 2 回呼ばれない)

#### Scenario: 通知失敗が upload 成功を覆さない
- **WHEN** Edge Function invoke がネットワークエラーで失敗
- **THEN** `submit()` は `{ ok: true, value: <IdentityDocumentId> }` を返し、UI は upload 成功画面を表示する

#### Scenario: ロールバック分岐では発火しない
- **WHEN** Storage upload が失敗し `submit()` が `{ ok: false, error: 'storage_failed_front' }` を返す
- **THEN** Edge Function は呼ばれない

#### Scenario: db_failed 分岐では発火しない
- **WHEN** 最終 `storage_path` UPDATE が失敗し `submit()` が `{ ok: false, error: 'db_failed' }` を返す
- **THEN** Edge Function は呼ばれない

#### Scenario: セッション欠落時の skip
- **WHEN** trigger 直前に Supabase セッションが取得できない
- **THEN** Edge Function invoke はスキップされ、`submit()` は `{ ok: true }` を返す
