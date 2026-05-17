## Context

商用利用開始後の本番障害検知を一次情報で立ち上げるための観測基盤を新規導入する。現状、フロント JS 例外は Render Service ログにも Supabase Dashboard ログにも届かず、口頭報告に依存している。Issue #267 は MVP2 マイルストーンだが、admin / reservation の本番カットオーバー前に dev / prd 両方の配線を仕込んでおき、カットオーバー時に切替操作を最小化する方針で着手する（環境戦略ドキュメントの Phase 3 観測ツール先行配備に該当）。

ステークホルダーは翔太郎くん単独。アラート受信先は翔太郎くんの Gmail。利用ボリュームは個人開発スケールで、Sentry 無料枠（5K errors / month）に収まる前提で設計する。

## Goals / Non-Goals

**Goals:**

- フロント 3 アプリ（LP / admin / reservation）と Supabase Edge Function（`_shared/`)の 4 経路すべてで未捕捉例外を Sentry に送出する
- **「通知 = 即アクション」を初期から成立させる**: ビジネス異常系・期待される 4xx 応答・既知ノイズパターンを送出前に破棄し、対処が要されるエラーのみ Sentry に到達させる
- 個人情報（メールアドレス・氏名・本人確認画像 URL・認証トークン・パスワード）を送信ペイロードから除外する
- dev / prd を `environment` タグで識別し、誤検知を環境境界で分離する
- 1 Sentry プロジェクトに集約し、無料枠を 4 経路で分散させない
- アラート発火条件を `prd × level=error 以上 × 新規 unresolved issue` の AND で絞り、Gmail フィルタ運用に耐える件名にする
- ロギング方針ドキュメントの「将来対応」記述を実運用ルールに昇格する

**Non-Goals:**

- パフォーマンスモニタリング（APM）の詳細チューニング — `tracesSampleRate` は固定値で開始し別 Issue で詰める
- ソースマップアップロード — minify 後のスタックトレース解読は後続 Issue
- Supabase Log Drain との統合 — Edge Function ログを Sentry 以外に流す要件は別 Issue
- ユーザー行動トラッキング（Session Replay / breadcrumbs カスタム拡張）
- Slack / Discord 等への通知経路 — Gmail で運用してから判断

## Decisions

### D1: 1 Sentry プロジェクトに集約し、タグで識別する

**選択**: プロジェクトを `high-q-volleyball` 1 つに統一。`environment`（dev / prd）と `project_name`（lp / admin / reservation / edge）の 2 軸タグで識別する。

**理由**: Sentry 無料 Developer プランは 5K errors / month を 1 プロジェクトに集約できる。4 プロジェクトに分割すると枠の利用効率が落ち、ダッシュボードも 4 つ巡回が必要になる。タグで識別すれば後から分割は容易だが、分割からの統合は困難。

**却下案**: 4 プロジェクト（LP / admin / reservation / edge-functions）に分離 — UI の見通しは良いが無料枠の浪費と運用負荷増。

### D2: Edge Function は Sentry HTTP API 直送、SDK 非依存

**選択**: `supabase/functions/_shared/sentry.ts` で Sentry envelope 形式を `fetch` で POST するヘルパを作る。SDK は導入しない。

**理由**: `@sentry/deno` は実験的で公式 npm 配布も弱く、Supabase Edge Function（Deno Deploy 派生）での動作実績が不明。HTTP API 直送なら依存ゼロ、型定義も自前最小限で済む。スタックトレース整形は手動だが Edge Function の関数本体は短く、対応コストは限定的。

**却下案 1**: `@sentry/deno` を esm.sh 経由で読み込む — 動作不確実、SDK 更新で挙動変化リスク。
**却下案 2**: `console.error` のまま Supabase Dashboard ログに任せる — Sentry 集約から外れ、アラート化できない。

### D3: DSN は Render 環境変数で配布、PR Preview は dev DSN を流す

**選択**: フロントは `VITE_SENTRY_DSN` を Render Static Site の env var として配布。本番サービスには prd DSN、PR Preview には dev DSN を `sync:false` で固定する。Edge Function 側 DSN は Supabase Secrets に登録する。

**理由**: 既存方針（PR Preview は prd Supabase を向く）と異なり、Sentry については **PR Preview は dev DSN** に倒す。理由は、PR Preview で発生する開発中エラーが本番ダッシュボードを汚染すると本番障害検知のシグナル/ノイズ比が悪化するため。Sentry の `environment` タグも `dev` 固定で流す。

**却下案**: PR Preview にも prd DSN を流す — 監視ツールに開発時エラーが混入し本番アラートが鈍る。

### D4: PII 除去は `beforeSend` フックで実装、denylist + redact 方式

**選択**: 各アプリの Sentry 初期化で `beforeSend(event)` を実装し、以下を破壊的に除去する:

- `request.cookies` / `request.headers.authorization` / `request.headers.cookie`
- `request.data` / `extra` / `contexts.user` のキー名に `email` / `name` / `phone` / `mynumber` / `document` / `password` / `token` を含む値
- スタックトレース内の URL クエリパラメータ
- `user.email` / `user.username` — `user.id`（UUID）のみ残す

Edge Function 側は HTTP API 直送ラッパで同等の filter を通してから送信する。

**理由**: SDK の自動収集（XHR / fetch / location）に PII が混入し得るため、送信前の単一ゲートで止める方が漏れリスクが低い。allowlist より denylist + redact を選ぶ理由は、新規プロパティ追加時のフェイルセーフ（既定で残すが疑わしいキー名は redact）。

**却下案**: 呼び出し側で `Sentry.captureException` 前に sanitize — 経路が増えるたびに漏れ穴が増える。

### D5: サンプリング率は dev 1.0 / prd 0.1、`tracesSampleRate` のみ調整

**選択**:
- `Sentry.init({ tracesSampleRate })`: dev `1.0` / prd `0.1`
- `sampleRate`（error イベント）: 両環境 `1.0` 固定（エラーは全件取る）

**理由**: 個人開発スケールで本番 5K events / month を超える主要因はトレーススパン。エラー自体は希少なので全件保持する。dev は再現性確保のため全 trace を保持。

### D6: 共通ヘルパの配置と公開 API

**選択**: ロジック層を 2 段に分け、コア純関数群を `packages/shared/src/observability/` に集約、各アプリは薄い init wrapper を置く。

- `packages/shared/src/observability/sentry-filters.ts`: `redactPII(event)` / `mapStatusToLevelAndFingerprint(event)` / `sampleByLevel(event)` / `pathTemplate(url)` / `IGNORED_ERROR_PATTERNS` などの純関数とテーブル定数。フレームワーク非依存（@sentry/vue / @sentry/browser に直接依存しない）。`SentryEvent` 型は薄く wrap した interface で受ける
- `apps/<app>/src/shared/lib/sentry.ts`: `@sentry/vue` を import し `initSentry(app, projectName)` / `captureException(err, ctx)` を Public API で公開。`beforeSend` でコア関数を順次適用するだけの薄い wrapper
- `supabase/functions/_shared/sentry.ts`: Edge Function 向け。Deno は workspace パッケージを import できないため、コア関数のロジックは仕様レベルで同じだが**ファイル自体は複製**する（80 行以下のサイズなので許容）。テーブル定数のみ手動同期し、差分は CI（`pnpm typecheck`）では検知できないため `_shared/sentry.test.ts` 相当の Deno test で確認

**理由**: 3 アプリの `beforeSend` 実装を完全コピーするとフィルタの食い違いリスクが大きく、PII denylist の保守が 3 倍コストになる。コア層を @high-q/shared に集約すれば 1 箇所更新で 3 アプリに反映、テストも 1 つで済む。Edge Function（Deno）は workspace import の制約で複製が必要だが、Vue 依存を排除した純関数群なので複製してもサイズは限定的。

**却下案 1**: 3 アプリで完全複製 — フィルタ更新が 3 重作業、食い違いで監視品質が劣化。
**却下案 2**: 別パッケージ `@high-q/observability` を新設 — 今回 1 capability だけのために workspace package を切るのは過剰。`@high-q/shared` のサブパスとして始め、規模が膨らんだら別 Issue で抽出する。

### D7: 送出ポリシー — ビジネス異常系は Sentry に出さない

**選択**: `Result<T, AppError>` の `Err` 経路は Sentry 送出対象外とする。`captureException` を呼ぶのは以下のいずれかに限定する:

- フレームワークが補足する未捕捉例外（Vue `errorHandler` / `unhandledrejection`）
- `try/catch` で意図的に握った技術エラー（fetch 失敗 / DOM API 失敗 / 想定外の throw）
- Edge Function の本処理外（HTTP ハンドラレベル）で throw された例外

**理由**: プロジェクトは Result 型でビジネス異常系を戻り値表現に統一済み（`packages/shared/src/types/result.ts`）。バリデーション失敗・認可拒否・404 等は UI フィードバックで完結する事象であり、Sentry に出すと「通知 = 即アクション」原則が崩れる。`Result` の `Err` を `console.warn` で構造化ログ化するパターンは既存 `logger` で十分カバーされている。

**却下案**: すべての `Err` を Sentry に送り後段でフィルタ — 無料枠を浪費、ダッシュボードが PR Preview の試行錯誤で汚染される。

### D8: HTTP 4xx 応答は破棄せず `level:info` で集約観測対象として送出

**選択**: 4xx 応答を `beforeSend` で破棄せず、以下のマッピングで `level` と `fingerprint` を制御して送出する。`sampleRate` は level 別に降格させ無料枠を保護する。

| status | level | fingerprint | sampleRate |
|---|---|---|---|
| 401 | `warning` | `['auth-denied', '401', '<endpoint>']` | 0.2 |
| 403 | `warning` | `['auth-denied', '403', '<endpoint>']` | 0.2 |
| 404 | `info` | `['not-found', '<url-path>']`（URL ごと） | 0.05 |
| 400 / 422 | `info` | `['validation', '<endpoint>']` | 0.05 |
| その他 4xx | `warning` | `['client-error', '<status>', '<endpoint>']` | 0.2 |
| 5xx | `error` | デフォルト（メッセージ + スタック） | 1.0 |
| network / AbortError | `error` | `['network-error']` | 1.0 |
| 未捕捉例外 | `error`/`fatal` | デフォルト | 1.0 |

**理由**: 個別 4xx は「対処不要」だが、`401 が 5min で 50 件超 → ブルートフォース疑い`、`404 が 1h で 100 件超 → URL 構造破壊`、`422 が急増 → API 契約破綻` のような **集約異常値は重大なシグナル**。完全破棄するとこの検知経路ごと消える。`level:info` で送出し、Issue Alert の "event count threshold" で異常値通知に回せば、Developer プランの機能で 2 軸検知が成立する。

**却下案 1**: 4xx 完全破棄（旧案）— 異常値検知の網羅性が損なわれる。翔太郎くんの指摘で却下。
**却下案 2**: 4xx を別の集計系統（DB audit_log / Supabase Analytics）に分離 — 構築コスト過大、Sentry に統合できる利点を放棄する。

### D9: 既知ノイズパターンも完全破棄せず `level:info` で集約観測対象に降格

**選択**: SDK の `ignoreErrors` で完全破棄するのは **明確に Sentry の責務外** の以下のみとする:

- `Non-Error promise rejection captured`（SDK 内部の型違反 noise）
- 既知の browser extension typename のうちスタックが完全に取得不能なもの

それ以外の従来「破棄」候補は `level:info` + `fingerprint:['known-noise', '<pattern>']` で送出する:

| パターン | level | fingerprint | sampleRate |
|---|---|---|---|
| `ResizeObserver loop limit exceeded` 系 | `info` | `['known-noise', 'resize-observer-loop']` | 0.05 |
| `Script error.`（CORS スタック不能） | `info` | `['known-noise', 'cors-script-error']` | 0.05 |
| browser extension 典型シグネチャ（スタック取得可） | `info` | `['known-noise', 'extension', '<pattern>']` | 0.05 |

Sentry SaaS 側の **Inbound Filter** は `localhost` / `127.0.0.1` / Web Crawler のみ入口破棄に縮小する。browser extension の Inbound Filter は無効化（SDK 側で `level:info` 送出に降格）。

**理由**: `ResizeObserver loop` 急増 → 特定 UI コンポーネントの破綻、`Script error.` 急増 → CSP 変更ミス / 3rd party 障害、のように「ノイズパターンの急増」自体が重大バグの兆候になる。完全破棄するとこの検知経路ごと消える。SDK サンプリング 0.05 で帯域消費を抑え、`known-noise` グループの event count threshold で異常値検知する。

**却下案**: 完全破棄継続 — 急増検知ができない。月次ダッシュボード目視運用に頼ると見落とす。

### D10: アラートを 2 系統で運用（即時通知 + 異常値通知）

**選択**: Sentry プロジェクトのアラートルールを以下 2 系統で構築する。Sentry Developer プランの **Issue Alert + "An issue's event count is X in Y" conditions** で実装する。

**A. 即時通知系**（個別重大エラー）

| 条件 | アクション |
|---|---|
| `level:[error, fatal] AND environment:prd AND is:unresolved AND age:-5m` の新規 issue | `high.q.volleyball@gmail.com` に通知（件名 `[Sentry][prd][<project_name>] <title>`）|
| 一度 `resolved` にした issue が再発（リグレッション） | 同送信先に通知 |

**B. 異常値通知系**（集約スパイク検知）

| fingerprint group | 閾値（初期値） | 意図 |
|---|---|---|
| `auth-denied:401` | 5min で 30 件超 | ブルートフォース疑い |
| `auth-denied:403` | 1h で 50 件超 | 認可リグレッション疑い |
| `not-found` | 1h で 100 件超 | URL 構造破壊 / リンク切れデプロイ事故 |
| `validation` | 1h で 50 件超 | API 契約破綻 / フロント schema ズレ |
| `known-noise:*` | 1h で 1000 件超 | ノイズパターン異常急増（フィルタ見直し合図）|
| `network-error` | 5min で 20 件超 | 外部依存障害疑い |

すべて `environment:prd` 限定。dev 環境のアラートルールは作成しない。閾値は初期値、本番ローンチ後の最初の 2 週間で観測して調整する。

**理由**: 個別 issue としては低 level（info / warning）で対応キューに乗らないが、集約スパイクは重大シグナル。Issue Alert の event count threshold は Sentry の fingerprint 単位で動くため、fingerprint 設計が機能する前提でこの 2 軸が成立する。

**却下案 1**: Metric Alert（カスタムメトリクス） — Business プラン以上が必要、無料枠で動かない。
**却下案 2**: 異常値通知も dev 環境で発火 — PR Preview の試行錯誤で誤発火が増える。

### D11: fingerprint 設計の規約

**選択**: すべての送出イベントに明示的な `fingerprint` を設定する場合、配列の **第 1 要素を「カテゴリ」、第 2 要素以降を「集約軸」** とする規約を `_shared/sentry.ts` / 各アプリの `shared/lib/sentry.ts` で固定する:

```
['<category>', '<axis-1>', '<axis-2>', ...]
```

カテゴリ一覧:
- `auth-denied`: 認証認可拒否（401 / 403）
- `not-found`: リソース不在（404）
- `validation`: 入力検証失敗（400 / 422）
- `client-error`: その他 4xx
- `network-error`: ネットワーク失敗・タイムアウト
- `known-noise`: 既知無害例外
- （default - 5xx と未捕捉例外は fingerprint 指定なし、Sentry のデフォルト fingerprint 算出に委ねる）

**理由**: 異常値通知系（D10-B）はカテゴリで group 化する必要がある。fingerprint 設計を spec で固定しないと、実装者ごとに axis の取り方がブレてアラートが機能しない。URL や endpoint の高カーディナリティ axis は `<path-template>`（例: `/api/events/:id` のような placeholder 化）にすることで、個別 ID 単位の issue 爆発を防ぐ。

**却下案**: fingerprint を Sentry デフォルトに任せる — メッセージ文字列の微差で issue が分裂し、集約閾値が機能しない。

### D12: テスト時の送信抑制

**選択**: `import.meta.env.MODE === 'test'` および Vitest セットアップで `Sentry.init` を `enabled: false` にする。E2E（Playwright）でも dev DSN は使うが、特定 fixture で `window.__SENTRY_TEST_SUPPRESS__ = true` フラグを立てた場合は `beforeSend` で `null` を返して破棄する。

**理由**: テスト中に Sentry へ意図しないトラフィックを流さない。Vitest の vi.spyOn(console, 'error') と Sentry 自動収集の衝突を避ける。

## Risks / Trade-offs

- **[無料枠 5K events / month 超過]** → `tracesSampleRate` 0.1 + エラーループ検知（同一フィンガープリント 100/h 超で `beforeSend` 戻り値 null 化）。ダッシュボードに月次使用量アラートを 80% で設定。
- **[PII フィルタ漏れ]** → denylist のキー名追加で対応可能な設計にしておく。Sentry イベント受信後に翔太郎くん自身が定期的にイベントペイロードを目視確認し、漏れたキー名を `beforeSend` の denylist に追加するルールをロギング方針に明文化。
- **[Edge Function HTTP API 直送のレイテンシ]** → 本処理を待たせない fire-and-forget 方式（`EdgeRuntime.waitUntil(sendToSentry(...))` 相当）。送信失敗は `console.error` にフォールバックして握りつぶさない。
- **[Render env var の取り違え]** → dev / prd DSN を `sync:false` で固定。PR の services 設定追加時は `previewValue` を必ず dev に設定するレビュー観点を `docs/03-アーキテクチャ/03-インフラ・CICD構成.md` に追記済みの構成を踏襲。
- **[Sentry SaaS 障害時]** → 送信失敗を握りつぶさず `console.error` に出力。Supabase Dashboard 経由で最低限の事後追跡は可能。

## Migration Plan

1. Sentry SaaS にアカウント作成、`high-q-volleyball` プロジェクトを 1 件作成（プラットフォーム: Vue / JavaScript）
2. dev / prd 2 環境分の DSN を発行（Sentry は 1 プロジェクト 1 DSN だが、`environment` タグで分離）
3. Render dev サービス 3 つ（lp / admin / reservation）に `VITE_SENTRY_DSN` を env var 追加、PR Preview には `previewValue` で dev DSN を流す
4. Supabase dev プロジェクトの Edge Function Secrets に `SENTRY_DSN` 追加
5. 各アプリの `main.ts` に Sentry 初期化、`_shared/sentry.ts` に HTTP API 直送ラッパ実装
6. テスト用例外発火コードを 4 経路すべてで実行し Sentry に届くことを確認
7. ロギング方針ドキュメント更新
8. **本番カットオーバー時**: Render prd サービスに prd DSN を env var として追加。Supabase prd Edge Function Secrets にも追加。アラート通知先を翔太郎くん Gmail に切替

ロールバック: Sentry 側で DSN を invalidate するか、Render env var を空文字列に上書きすれば送信停止。コード側にも `if (!dsn) skip init` のガードを実装する。

## E2E スケーラビリティ運用ルール対応

本変更は UI 機能ではなく観測基盤のため、Playwright E2E の新規シナリオ追加は行わない。代わりに 4 経路すべてで「テスト例外を意図的に発火させ Sentry ダッシュボードに記録されることを目視確認する」手順を tasks.md に手動 QA タスクとして含める。

## Open Questions

- prd 切替時のアラート閾値（1 時間あたりエラー数 X 件で通知）の具体値は本番トラフィックを観測してから別 Issue で調整する
- `@high-q/observability` パッケージ抽出は 3 アプリで PII フィルタ実装が完全に同一になった段階で別 Issue 化する
