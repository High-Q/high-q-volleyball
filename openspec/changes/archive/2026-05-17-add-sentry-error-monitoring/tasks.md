## 1. Sentry SaaS セットアップ（翔太郎くん操作）

- [ ] 1.1 Sentry に高 Q 用アカウント作成し `high-q-volleyball` プロジェクトを Vue / JavaScript プラットフォームで 1 件作成
- [ ] 1.2 dev / prd 用に DSN を発行（同一プロジェクト 1 DSN 運用とし、environment タグで分離する場合は単一 DSN、別 DSN で分けたい場合は Internal Integration 経由で 2 件発行）方針確定
- [ ] 1.3 アラートルール A 系（即時通知）2 件を作成:
  - A-1 新規 issue 検知: `environment:prd` AND `level:[error, fatal]` AND `is:unresolved` AND 初出 5 分以内
  - A-2 リグレッション: 一度 `resolved` にした issue の再発
  - 通知先 `high.q.volleyball@gmail.com`、件名 `[Sentry][{environment}][{project_name}] {title}` 形式
  - dev 環境向け A 系ルールは作成しない
- [ ] 1.4 アラートルール B 系（異常値通知）6 件を作成（Issue Alert + "event count" condition）:
  - B-1 `tags:fingerprint_category:auth-denied AND tags:fingerprint_axis_1:401 AND environment:prd`: 5min で 30 件超
  - B-2 `tags:fingerprint_category:auth-denied AND tags:fingerprint_axis_1:403 AND environment:prd`: 1h で 50 件超
  - B-3 `tags:fingerprint_category:not-found AND environment:prd`: 1h で 100 件超
  - B-4 `tags:fingerprint_category:validation AND environment:prd`: 1h で 50 件超
  - B-5 `tags:fingerprint_category:known-noise AND environment:prd`: 1h で 1000 件超
  - B-6 `tags:fingerprint_category:network-error AND environment:prd`: 5min で 20 件超
  - 通知先・件名フォーマットは A 系と同様、件名先頭に `[Anomaly]` 等のプレフィックスを追加してフィルタ可能に
  - tag は `beforeSend` で `fingerprint_category` / `fingerprint_axis_1` / `fingerprint_axis_2` に自動付与済み
- [ ] 1.5 月次使用量アラートを 80%（4000 events / month）で設定
- [ ] 1.6 Sentry SaaS の **Inbound Filter** を設定: `localhost` / `127.0.0.1` / Web Crawler のみ入口破棄（browser extension の Inbound Filter は無効化、SDK 側で `level:info` 送出に降格）

## 2. 環境変数配布（翔太郎くん操作）

- [ ] 2.1 Render dev / prd の lp / admin / reservation 各サービスに `VITE_SENTRY_DSN` を `sync:false` で追加。本番 value に prd DSN、`previewValue` に dev DSN を固定
- [ ] 2.2 Supabase dev / prd プロジェクトの Edge Function Secrets に `SENTRY_DSN` と `SENTRY_ENVIRONMENT`（`dev` / `prd`）を登録（prd 側は本番カットオーバー時まで未設定でも可）
- [ ] 2.3 `.env.example`（リポジトリ root）に `VITE_SENTRY_DSN=` 行を追加（値は空文字、初期化はガード付きでスキップ）

## 3. フロント Sentry 初期化共通実装

- [x] 3.1 `apps/lp/src/shared/lib/sentry.ts` を新規作成し `initSentry(app)` と `captureException(err, ctx)` の Public API を定義
- [x] 3.2 `apps/admin/src/shared/lib/sentry.ts` を同一インターフェースで作成
- [x] 3.3 `apps/reservation/src/shared/lib/sentry.ts` を同一インターフェースで作成
- [x] 3.4 `packages/shared/src/observability/redactPII.ts` で PII 除去パートを実装: `request.cookies` / `Authorization` / `Cookie` ヘッダ除去、`extra` `contexts` `request.data` のキー名 denylist に対して値を `[REDACTED]` に置換、スタックトレース URL のクエリ文字列削除、`user.email` / `user.username` 削除（`user.id` のみ保持）
- [x] 3.5 `packages/shared/src/observability/mapStatus.ts` で **status マッピング層** を実装: HTTP status / エラーメッセージパターンから `event.level` と `event.fingerprint` を決定
- [x] 3.6 `packages/shared/src/observability/sample.ts` で **level 別サンプリング層** を実装（error/fatal=1.0、warning=0.2、info=0.05、random 注入可）
- [x] 3.7 `packages/shared/src/observability/mapStatus.ts` の `applyStatusMapping` で **tag 付与層** を実装: fingerprint 配列の各要素を `fingerprint_category` / `fingerprint_axis_1` / `fingerprint_axis_2` tag に複製
- [x] 3.8 `packages/shared/src/observability/pathTemplate.ts` で **path template 化ユーティリティ** を実装: UUID / 数値 ID / メールアドレス等を `:id` `:n` `:email` に置換
- [x] 3.9 `Sentry.init` の `ignoreErrors` を `Non-Error promise rejection captured` のみに縮小（旧 denylist の他項目は `beforeSend` の known-noise 経路で扱う）
- [x] 3.10 `Sentry.init` のオプション: `tracesSampleRate: PROD ? 0.1 : 1.0`、`sampleRate: 1.0`、`environment: PROD ? 'prd' : 'dev'`、ガード `!DSN || MODE === 'test'` で init スキップ
- [x] 3.11 各アプリ `main.ts` / `main.js` で `initSentry(app)` を `app.mount()` の直前に呼び出す
- [x] 3.12 `Result` の `Err` 経路は **`captureException` を呼ばない** ことをコードレビュー観点として `docs/06-品質・セキュリティ/07-ロギング方針.md` に明記

## 4. Edge Function HTTP API 直送実装

- [x] 4.1 `supabase/functions/_shared/sentry.ts` を新規作成、`captureException(error, context)` を Public API で公開
- [x] 4.2 Sentry envelope 形式（`{header}\n{item}\n{payload}\n`）を組み立て `<protocol>://<host>/api/<projectId>/envelope/` に `fetch` で POST。`X-Sentry-Auth` ヘッダを DSN から組成
- [x] 4.3 PII フィルタを同等のキー名 denylist で実装（送信前に context オブジェクトを通す）
- [x] 4.4 同等の status / メッセージマッピング層を実装: フロント 3.5 と同じテーブルで level / fingerprint を決定
- [x] 4.5 同等の level 別サンプリング層を実装（error=1.0 / warning=0.2 / info=0.05）
- [x] 4.6 `environment` / `project_name=edge` / `function_name=<関数名>` / `fingerprint_category` / `fingerprint_axis_1` / `fingerprint_axis_2` の tags 付与
- [x] 4.7 送信は `EdgeRuntime.waitUntil` で fire-and-forget。失敗時は `console.error` フォールバック
- [x] 4.8 既存 `supabase/functions/_shared/mailer.ts` の `sendMail` try/catch に `captureException` を組み込む

## 5. テストと疎通確認

- [x] 5.1 admin Sentry wrapper のユニットテスト（`apps/admin/src/shared/lib/sentry.spec.ts`）: テスト環境で `Sentry.init` が呼ばれないこと / DSN 未設定時 `captureException` が `console.error` にフォールバックすること
- [x] 5.2 `redactPII` のフィルタユニットテスト: denylist のキー名すべてを `[REDACTED]` 化することを検証
- [x] 5.3 `mapStatus` の status マッピングユニットテスト: 401/403/404/400/422/500/503/network それぞれで `event.level` と `event.fingerprint` が D8 マッピング表通りに書き換わることを検証
- [x] 5.4 `mapStatus` のノイズ降格ユニットテスト: `ResizeObserver loop limit exceeded` / `Script error.` が `level:info` / `fingerprint:['known-noise', '<pattern>']` に書き換わることを検証
- [x] 5.5 `pathTemplate` のユニットテスト: UUID / 数値 ID / メールアドレスを含む URL が `:id` `:n` `:email` に置換されることを検証
- [ ] 5.6 一時的なテスト用 throw を仕込み、LP / admin / reservation 3 アプリそれぞれで dev DSN 宛に到達することを Sentry ダッシュボード目視確認（手動 QA。確認後 throw は削除）
- [ ] 5.7 Edge Function（既存メーラー）で意図的に例外を発生させ Sentry に届くことを目視確認
- [ ] 5.8 ネガティブ確認: `Result.err(appError('VALIDATION_X', ...))` を返すコードパスを実行しても Sentry に到達しないことを目視確認
- [ ] 5.9 異常値通知の疎通確認: dev 環境で 401 を 30 件以上短時間に発生させても dev 環境にはアラートルールがないため通知されないこと、prd で同等のテスト発火を行うと B-1 ルールから通知が届くことを確認（最終段、prd DSN 有効化後）

## 6. ドキュメント更新

- [x] 6.1 `docs/06-品質・セキュリティ/07-ロギング方針.md` の「監視・モニタリング連携」セクションを実運用ルールに昇格（送出ポリシー 2 軸 / level マッピング表 / fingerprint カテゴリ規約 / アラート 2 系統 / PII 取扱 / 保守ルール / コードレビュー観点を網羅）
- [x] 6.2 `docs/03-アーキテクチャ/03-インフラ・CICD構成.md` の LP / admin / reservation 各サービス定義に `envVars[].VITE_SENTRY_DSN` 行を追加（sync:false / previewValue:dev 固定）
- [x] 6.3 `docs/08-移行/01-環境戦略・本番リリース計画.md` の Phase 3 観測ツール記述を「Sentry 配備済み、prd DSN はカットオーバー時に有効化」に更新

## 7. 最終確認

- [x] 7.1 `pnpm -r test` 相当（admin 764 / reservation 620 / lp 46 / shared 101 件）がパス
- [x] 7.2 `pnpm build:lp` / `pnpm --filter @high-q/admin build` / `pnpm --filter @high-q/reservation build` がパス（Sentry SDK バンドル増は admin +50KB / reservation +50KB / lp +30KB 程度）
- [x] 7.3 `openspec validate add-sentry-error-monitoring` がパス
- [ ] 7.4 PR 作成、Render PR Preview で 3 アプリそれぞれの `initSentry` が dev DSN で動くことを Sentry ダッシュボードで確認（DSN 配布後）
