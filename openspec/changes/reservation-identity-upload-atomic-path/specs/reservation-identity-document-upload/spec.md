## ADDED Requirements

### Requirement: アップロード手順は実パス確定済みで Storage 表裏並列 upload → DB 行 INSERT の順で行う

書類アップロードは `features/identity-document/composables/useUploadIdentityDocument.ts` の `submit(input)` で MUST 以下の順序で実行する。行の作成を最後に置き、行が存在する時点でその `storage_path_*` が指す Storage オブジェクトが必ず存在する状態を保証する SHALL。

1. クライアントで書類 id を採番する (Web 標準の UUID 生成、`crypto.randomUUID()` 等)。DB 採番に依存しない
2. パスを構築: `frontPath = <member_id>/<id>-front.<ext_front>` (必須) と、裏面提出時は `backPath = <member_id>/<id>-back.<ext_back>` (任意)
3. **`Promise.all` で表裏並列アップロード**:
   - `supabase.storage.from('identity-documents').upload(frontPath, frontFile, { contentType: frontFile.type })`
   - 裏面ファイルがある場合のみ: `supabase.storage.from('identity-documents').upload(backPath, backFile, { contentType: backFile.type })`
4. **両方成功時**: `supabase.from('identity_documents').insert({ id: <id>, member_id: <auth.uid()>, document_type: <selected>, storage_path_front: frontPath, storage_path_back: backPath ?? null, status: 'pending' })` を **1 回だけ** 実行して行を確定する。行作成後に `storage_path_*` を書き換える追加 UPDATE は MUST NOT 行う
5. **いずれかの upload が失敗時**: 成功した方の Storage オブジェクトを削除し (行はまだ作られていない)、エラーを返す
6. **行 INSERT が失敗時**: 直前に保存した表裏の Storage オブジェクトを削除し、エラーを返す

裏面アップロードは表面と同等の **必須トランザクション境界** で扱う MUST: 裏面が指定されていれば両方成功で初めて全体成功とみなす。片方だけ成功した中途半端な状態は許容しない。

仮パス (placeholder) で行を先に作り後から実パスへ確定する手順は MUST NOT 採用する。これにより「行は仮パスのまま・画像実体は保存済み」という管理画面から画像取得不能になる残留状態は構造的に発生しない SHALL。失敗時に残り得るのは、どの行からも参照されない孤立 Storage オブジェクトのみで、管理画面・会員体験に影響しない。

#### Scenario: 表面のみの happy path
- **WHEN** ユーザーが運転免許証 + 5MB jpg (表面のみ) を選択して送信
- **THEN** Storage に `<member_id>/<id>-front.jpg` がアップロードされた後、`storage_path_front` にその実パス・`storage_path_back = NULL` を持つ identity_documents 行が 1 件 INSERT される。行作成後の storage_path UPDATE は発生しない

#### Scenario: 表裏両方の happy path
- **WHEN** ユーザーが運転免許証 + 表面 jpg + 裏面 jpg を選択して送信
- **THEN** Storage に front と back の 2 オブジェクトが並列アップロードされた後、`storage_path_front` / `storage_path_back` 両方に実パスを持つ行が 1 件 INSERT される

#### Scenario: 行が存在するなら画像実体も存在する
- **WHEN** `submit()` が成功して identity_documents 行が作成される
- **THEN** その `storage_path_front` (および NOT NULL なら `storage_path_back`) が指す Storage オブジェクトは必ず存在する (仮パス `__pending__` の行は生成され得ない)

#### Scenario: ファイル名の正規化
- **WHEN** ユーザーが `IMG.HEIC` をアップロード (heic2any で jpeg 変換後)
- **THEN** Storage パスは `<member_id>/<id>-front.jpg` (拡張子は変換後の jpg) になり、同じ実パスが行の `storage_path_front` に入る

#### Scenario: 表面 Storage upload 失敗のロールバック
- **WHEN** 表面の Storage upload が失敗 (network エラー等)
- **THEN** identity_documents 行は作成されず、成功していた側の Storage オブジェクトも削除され、孤立行は残らない。エラーは `'storage_failed_front'` として返る

#### Scenario: 裏面 Storage upload 失敗のロールバック
- **WHEN** 表面 upload は成功したが裏面 upload が失敗
- **THEN** 表面の Storage オブジェクトも削除され、identity_documents 行は作成されない。エラーは `'storage_failed_back'` として返る

#### Scenario: 行 INSERT 失敗時のロールバック
- **WHEN** 表裏の Storage upload は成功したが最終の行 INSERT が失敗
- **THEN** 直前に保存した表裏の Storage オブジェクトが削除され、どの行からも参照されない孤立オブジェクトも残らない。エラーは `'db_failed'` として返り、会員にはエラーメッセージを表示してやり直しを促す (管理画面から見える壊れた行は発生しない)

## MODIFIED Requirements

### Requirement: アップロード成功時にオーナー通知 Edge Function を fire-and-forget で発火する

`features/identity-document/composables/useUploadIdentityDocument.ts` の `submit(...)` は MUST 最終の行 INSERT が成功し `{ ok: true, value: <IdentityDocumentId> }` を返す直前で、オーナー通知 Edge Function (`send-identity-document-pending-notification`) を `void` で呼び出す SHALL。

呼び出し方は MUST 以下を満たす:

- `await` しない (fire-and-forget)
- 呼び出し失敗 / Edge Function の `{ ok: false }` レスポンス / セッション欠落のいずれも `submit()` の成功判定を覆さない
- 失敗ケースは `console.warn` に相関情報 (identityDocumentId / 失敗理由) を残す
- UI 側はオーナー通知の成否に関わらず upload 成功表示 (緑バナー → ホーム CTA) を描画する

`submit()` が `{ ok: false, error: 'storage_failed_*' }` / `{ ok: false, error: 'db_failed' }` を返すロールバック分岐では Edge Function を MUST NOT 呼び出す (行が作成されていないため通知意味なし)。

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
- **WHEN** 最終の行 INSERT が失敗し `submit()` が `{ ok: false, error: 'db_failed' }` を返す
- **THEN** Edge Function は呼ばれない

#### Scenario: セッション欠落時の skip
- **WHEN** trigger 直前に Supabase セッションが取得できない
- **THEN** Edge Function invoke はスキップされ、`submit()` は `{ ok: true }` を返す

## REMOVED Requirements

### Requirement: アップロード手順は DB 行 INSERT → Storage 表裏並列 upload → storage_path UPDATE の順で行う

**Reason**: 仮パスで行を先に作り、upload 後に実パスへ確定する手順は、最終の確定 UPDATE が失敗すると「行は仮パスのまま・画像実体は保存済み」という管理画面から画像取得不能になる残留状態を生む。商用で実際に滞留が発生した。確定 UPDATE を廃し、実パス確定済みで upload → 行 INSERT の順にする新手順 (本 delta の ADDED 要件) へ置き換える。

**Migration**: アプリコードのアップロード手順を新要件へ差し替える。DB スキーマ・RLS・Storage 構成・パス命名規則は不変。既存の滞留データは復旧済みで、本変更にデータ移行は含まない。
