# error-monitoring Specification

## Purpose
TBD - created by archiving change add-sentry-error-monitoring. Update Purpose after archive.
## Requirements
### Requirement: 4 経路すべての未捕捉例外を Sentry に送出

システムは、`apps/lp` / `apps/admin` / `apps/reservation` のフロントエンドおよび Supabase Edge Function（`supabase/functions/**`）の 4 経路すべてで、未捕捉例外と明示的に `captureException` で送出されたエラーを Sentry に送出しなければならない (MUST)。

#### Scenario: フロント未捕捉例外の自動収集

- **WHEN** `apps/admin` の Vue コンポーネント内で `throw new Error('test')` が同期的に発火する
- **THEN** Sentry プロジェクト `high-q-volleyball` のイベント一覧にそのエラーが `project_name=admin` タグ付きで記録される

#### Scenario: Edge Function 例外の Sentry 送出

- **WHEN** `supabase/functions/<関数名>/index.ts` 内で例外が throw され `_shared/sentry.ts` のラッパ経由で `captureException` が呼ばれる
- **THEN** Sentry プロジェクトにそのエラーが `project_name=edge` タグ付きで記録され、Edge Function のレスポンスは送信完了を待たずに返る

### Requirement: PII を beforeSend で除去

システムは、Sentry に送出するすべてのイベントペイロードから、メールアドレス・氏名・電話番号・マイナンバー・本人確認書類 URL・パスワード・認証トークンを除去しなければならない (MUST)。除去は SDK の `beforeSend` フック、または Edge Function の HTTP API 直送ラッパ内で送信前に実施する。`user.id`（UUID）は識別子として残してよい。

#### Scenario: メールアドレスが extra に混入

- **WHEN** `Sentry.captureException(err, { extra: { email: 'user@example.com' } })` が呼ばれる
- **THEN** Sentry に到達したイベントの `extra.email` は `[REDACTED]` 等のプレースホルダに置換され、原文の文字列は含まれない

#### Scenario: スタックトレース URL のクエリ文字列

- **WHEN** スタックトレースのフレーム URL に `?token=abc123` が含まれる
- **THEN** Sentry に到達したフレーム URL からクエリ文字列が除去される

#### Scenario: user.id のみ保持

- **WHEN** `Sentry.setUser({ id: 'uuid-xxx', email: 'user@example.com', username: 'taro' })` が呼ばれる
- **THEN** Sentry に到達したイベントの `user` は `{ id: 'uuid-xxx' }` のみで、`email` と `username` は含まれない

### Requirement: 環境とプロジェクト経路のタグ付与

システムは、すべての Sentry イベントに `environment` タグ（`dev` または `prd`）と `project_name` タグ（`lp` / `admin` / `reservation` / `edge` のいずれか）を付与しなければならない (MUST)。

#### Scenario: 環境タグ

- **WHEN** 本番 Render サービスで動作する `apps/reservation` から例外が送出される
- **THEN** Sentry イベントの `environment` が `prd`、`project_name` が `reservation` でフィルタ可能

#### Scenario: PR Preview の環境タグ

- **WHEN** Render PR Preview で動作する `apps/admin` から例外が送出される
- **THEN** Sentry イベントの `environment` が `dev` として記録され、本番イベントと混在しない

### Requirement: 環境別 DSN の分離配布

システムは、dev 環境と prd 環境で異なる DSN（もしくは同一 DSN + 環境タグ）を使用し、PR Preview には dev 用の設定を流さなければならない (MUST)。Render フロントは `VITE_SENTRY_DSN` を `sync:false` の env var として配布し、PR Preview の `previewValue` には dev 用設定を固定する。Supabase Edge Function は dev / prd プロジェクトそれぞれの Secrets に `SENTRY_DSN` を登録する。

#### Scenario: PR Preview に prd DSN が流れない

- **WHEN** Render PR Preview ビルドが起動する
- **THEN** `import.meta.env.VITE_SENTRY_DSN` には dev 用 DSN が読み込まれ、本番 Sentry プロジェクトの本番ダッシュボードに開発時エラーが混入しない

### Requirement: サンプリング率の環境別固定

システムは、`tracesSampleRate` を dev で `1.0`、prd で `0.1` に設定しなければならない (MUST)。エラーイベントの `sampleRate` は両環境で `1.0` を維持する。

#### Scenario: 本番エラーの全件保持

- **WHEN** prd 環境で 100 件の例外が発生する
- **THEN** Sentry には 100 件すべてのエラーイベントが到達する（trace は 10 件相当に間引かれる）

### Requirement: Edge Function は HTTP API 直送かつ非ブロッキング

システムは、Supabase Edge Function から Sentry への送出を SDK 経由ではなく Sentry envelope HTTP API への `fetch` で行わなければならない (MUST)。送信は本処理のレスポンスをブロックしてはならず、送信失敗時は `console.error` でフォールバックする。

#### Scenario: Edge Function 応答の非ブロック

- **WHEN** Edge Function の本処理が完了し例外が捕捉される
- **THEN** Edge Function のレスポンスは Sentry 送信完了を待たずクライアントに返る

#### Scenario: Sentry SaaS 障害時のフォールバック

- **WHEN** Sentry API への送信が失敗する（4xx / 5xx / タイムアウト）
- **THEN** Edge Function は `console.error` に原エラー情報を出力し、Supabase Dashboard ログから事後追跡できる

### Requirement: ビジネス異常系を Sentry に送出しない

システムは、`Result<T, AppError>` の `Err` 経路で表現されるビジネス異常系（バリデーション失敗・認可拒否・404・競合状態・期待される事業ルール違反）を Sentry に送出してはならない (MUST NOT)。これらは UI フィードバックで完結する事象であり、`logger.warn` または `logger.info` で構造化ログとして記録するに留める。`captureException` は未捕捉例外と意図的に握った技術エラー（fetch 失敗・DOM API 失敗・想定外の throw）に限って呼び出してよい。

#### Scenario: バリデーションエラーは Sentry に到達しない

- **WHEN** フォーム入力が不正で `Err({ code: 'VALIDATION_INVALID_EMAIL', message: '...' })` が戻り値として返される
- **THEN** Sentry プロジェクトに該当イベントは記録されない

#### Scenario: 認可拒否は Sentry に到達しない

- **WHEN** RLS により Supabase が 403 を返し、呼び出し側が `Err({ code: 'AUTH_FORBIDDEN', ... })` で握る
- **THEN** Sentry プロジェクトに該当イベントは記録されない

### Requirement: HTTP 応答ステータスに応じた level / fingerprint / sampleRate の制御

システムは、HTTP 応答ステータスを伴うエラー（Supabase PostgrestError / fetch Response / Edge Function 応答 / 未捕捉例外で status が抽出可能なもの）について、`beforeSend` で以下のマッピングを適用しなければならない (MUST)。4xx は破棄せず `level:info` / `level:warning` で送出し、集約異常値検知の対象とする。

| status / 種別 | level | fingerprint | サンプル率 |
|---|---|---|---|
| 401 | `warning` | `['auth-denied', '401', '<endpoint>']` | 0.2 |
| 403 | `warning` | `['auth-denied', '403', '<endpoint>']` | 0.2 |
| 404 | `info` | `['not-found', '<url-path>']` | 0.05 |
| 400 / 422 | `info` | `['validation', '<endpoint>']` | 0.05 |
| その他 4xx | `warning` | `['client-error', '<status>', '<endpoint>']` | 0.2 |
| 5xx | `error` | デフォルト | 1.0 |
| ネットワーク失敗 / AbortError | `error` | `['network-error']` | 1.0 |
| 未捕捉例外（status 抽出不能） | `error` または `fatal` | デフォルト | 1.0 |

`<endpoint>` および `<url-path>` は path template 化（例: `/api/events/:id`）し、個別 ID で fingerprint が分裂しないようにする。

#### Scenario: 404 は info level で集約送出

- **WHEN** Supabase が `/storage/v1/object/identity-documents/foo.jpg` に対して 404 を返す
- **THEN** Sentry に level=info、fingerprint=`['not-found', '/storage/v1/object/identity-documents/:filename']` のイベントが（sampleRate 0.05 で）記録される

#### Scenario: 401 は warning level で auth-denied fingerprint に集約

- **WHEN** prd 環境で短時間に複数の 401 応答が発生する
- **THEN** Sentry の `auth-denied:401:<endpoint>` fingerprint group に集約され、event count が観測可能になる

#### Scenario: 5xx は error level で全件送出

- **WHEN** 外部 API が 503 を返し未捕捉のまま `captureException` 経路に到達する
- **THEN** Sentry に level=error のイベントが sampleRate 1.0（全件）で記録される

### Requirement: 既知ノイズパターンは破棄せず `level:info` で集約観測対象に送出

システムは、`ResizeObserver loop limit exceeded` / `Script error.` / browser extension 典型シグネチャを SDK の `ignoreErrors` で完全破棄してはならない (MUST NOT)。代わりに `beforeSend` で `level:info`、`fingerprint:['known-noise', '<pattern>']`、サンプリング率 0.05 で送出する。`Non-Error promise rejection captured` のような Sentry 責務外の SDK 内部 noise のみ `ignoreErrors` で完全破棄する。

Sentry SaaS の Inbound Filter は `localhost` / `127.0.0.1` / Web Crawler のみを入口破棄対象とする (MUST)。browser extension の Inbound Filter は無効化する。

#### Scenario: ResizeObserver loop は info level で集約

- **WHEN** ブラウザが `ResizeObserver loop limit exceeded` をグローバル `error` イベントで通知する
- **THEN** Sentry に level=info、fingerprint=`['known-noise', 'resize-observer-loop']` のイベントが sampleRate 0.05 で記録される

#### Scenario: localhost からの送出は入口破棄

- **WHEN** 開発者ローカル環境（`localhost:5173`）から誤って prd DSN にイベントが届く
- **THEN** Sentry SaaS の Inbound Filter で破棄され、ダッシュボードに残らない

#### Scenario: Non-Error promise rejection は SDK 段で破棄

- **WHEN** `unhandledrejection` で Error インスタンスでない値が reject される
- **THEN** SDK の `ignoreErrors` により Sentry に送出されない

### Requirement: fingerprint カテゴリ規約

システムは、`beforeSend` で明示的に `fingerprint` を設定する際、配列の第 1 要素を以下のカテゴリのいずれかとしなければならない (MUST):

- `auth-denied` / `not-found` / `validation` / `client-error` / `network-error` / `known-noise`

第 2 要素以降に集約軸（status / endpoint path template / noise pattern 等）を並べる。5xx と未捕捉例外（status 抽出不能なケース）は `fingerprint` を指定せず、Sentry のデフォルト算出（スタック + メッセージ）に委ねる。

#### Scenario: 配列形式の fingerprint

- **WHEN** 403 応答が `captureException` 経路に到達する
- **THEN** Sentry イベントの `fingerprint` が `['auth-denied', '403', '<endpoint>']` 形式で設定されている

### Requirement: アラート 2 系統運用（即時通知 + 異常値通知）

システムは、Sentry プロジェクトのアラートルールを以下 2 系統で構築しなければならない (MUST)。すべて `environment:prd` 限定とし、dev 環境向けアラートルールは作成しない (MUST NOT)。Gmail 件名は `[Sentry][{environment}][{project_name}] {title}` 形式でフィルタ可能とする。

**A. 即時通知系**

1. **新規 issue 検知**: `environment:prd` AND `level:[error, fatal]` AND `is:unresolved` AND 初出から 5 分以内のイベントで `high.q.volleyball@gmail.com` に通知
2. **リグレッション検知**: `resolved` にした issue が再発した場合のみ同送信先に通知

**B. 異常値通知系**（fingerprint group ごとに event count threshold で発火）

| fingerprint group | 初期閾値 | 検知意図 |
|---|---|---|
| `auth-denied:401:*` | 5min で 30 件超 | ブルートフォース疑い |
| `auth-denied:403:*` | 1h で 50 件超 | 認可リグレッション |
| `not-found:*` | 1h で 100 件超 | URL 構造破壊 / リンク切れデプロイ事故 |
| `validation:*` | 1h で 50 件超 | API 契約破綻 / schema ズレ |
| `known-noise:*` | 1h で 1000 件超 | ノイズ急増（フィルタ見直し合図）|
| `network-error` | 5min で 20 件超 | 外部依存障害疑い |

初期閾値は本番ローンチ後 2 週間の観測結果で見直す。

#### Scenario: prd 新規 error 級は即時通知

- **WHEN** prd 環境で新規 fingerprint の level=error イベントが記録される
- **THEN** 翔太郎くん Gmail に件名 `[Sentry][prd][<project_name>] <error message>` 相当のメールが 5 分以内に届く

#### Scenario: 401 急増の異常値通知

- **WHEN** prd 環境の `auth-denied:401:*` fingerprint group が直近 5min で 30 件を超える
- **THEN** 翔太郎くん Gmail に異常値通知メールが届く

#### Scenario: 404 急増の異常値通知

- **WHEN** prd 環境の `not-found:*` fingerprint group が直近 1h で 100 件を超える
- **THEN** 翔太郎くん Gmail に異常値通知メールが届く

#### Scenario: 個別 404 は通知されない

- **WHEN** prd 環境で単発の 404 が発生し、`not-found:*` group の event count が閾値未満にとどまる
- **THEN** Gmail 通知は発火しない（ダッシュボード記録は通常通り）

#### Scenario: dev 環境はアラート発火しない

- **WHEN** PR Preview（`environment=dev`）で level=error の新規エラーが発生する
- **THEN** Gmail へのアラートメールは送信されず、Sentry ダッシュボード上では通常通り記録される

### Requirement: テスト実行時の Sentry 送出抑制

システムは、Vitest / Playwright によるテスト実行時に Sentry へ実際のイベント送信が発生してはならない (MUST NOT)。`MODE === 'test'` または明示的な抑制フラグを検知して送信を停止する。

#### Scenario: Vitest 実行中の送信抑制

- **WHEN** `pnpm exec vitest run` でテストが実行され、テスト中に例外が捕捉される
- **THEN** Sentry プロジェクトのイベントには記録されず、`Sentry.init` が `enabled: false` で初期化される

