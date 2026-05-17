## Why

商用利用開始後、フロントエンド例外 / Edge Function エラーが **会員側で静かに失敗したまま気付けない** 状態を解消したい。現状は Render Service のサーバーログと Supabase Dashboard の Auth / Edge Function Logs しか追跡手段がなく、クライアント JS 例外は完全に不可視である。

ただし「ただ Sentry を入れる」だけだと、バリデーションエラー・認証失敗・外部 API 一時不調・ブラウザ拡張由来の無害例外などが通知を埋め尽くし、本当に対応すべきエラーが埋もれる。目指す状態は **「通知が来る = 即アクションが必要な事象が起きている」と確信できる状態** であり、初期からノイズ抑制ポリシーを組み込んだ設計で立ち上げる。

## What Changes

- 3 アプリ（LP / admin / reservation）と Supabase Edge Function（`_shared`）のすべての経路で未捕捉例外・想定外エラーを自動収集する基盤を導入する
- フロント 3 アプリは `@sentry/vue` 初期化、Edge Function は Sentry HTTP API 直送による捕捉ラッパーを共通化する
- Sentry プロジェクトは **1 プロジェクトに集約** し、`environment`（dev / prd）と `project_name`（lp / admin / reservation / edge）のタグで識別する
- DSN は Render の環境変数として配布し、PR Preview / 本番で別の DSN または環境タグを使い分ける
- **送出ポリシーを「個別 issue の通知可否」と「集約異常値の検知」の 2 軸で組む**:
  - `Result<T, AppError>` の `Err` 経路（ビジネス異常系）は送出しない（UI フィードバックで完結する正常系のため）
  - HTTP 4xx 応答（Supabase / fetch）と既知ノイズパターン（ResizeObserver loop / `Script error.` / Non-Error promise rejection 等）は **完全破棄せず `level:info` で送出**。`fingerprint` で意味のある集約単位（status × endpoint / url-path / noise-pattern）に振り分け、急増を検知できるようにする
  - `sampleRate` を level 別に分け（error/fatal=1.0, warning=0.2, info=0.05）、無料枠を守る
  - 5xx / ネットワーク失敗 / タイムアウト / 未捕捉例外は `level:error` 以上で全件送出
  - Sentry SaaS の Inbound Filter で `localhost` / Web Crawler のみ入口破棄（browser extension は集約観測対象として残す）
- 個人情報（メールアドレス・氏名・本人確認画像 URL・認証トークン）を送信ペイロードから除外する共通フィルタを実装する
- **アラートを 2 系統で運用する**:
  - **A. 即時通知**: `environment:prd AND level:[error,fatal] AND is:unresolved AND age:-5m` の AND 条件で翔太郎くん Gmail へ通知
  - **B. 異常値通知**: 特定 fingerprint group（`auth-denied`/`not-found`/`validation`/`known-noise` 等）が時間窓内の閾値超で発火し、Gmail へ通知
  - dev 環境のアラートルールは作成しない（ダッシュボード目視のみ）
- ロギング方針ドキュメントに Sentry 運用ルール（2 軸送出ポリシー・level/fingerprint マッピング・PII 取扱・サンプリング率・2 系統アラート閾値・閾値見直しサイクル）を追記する

## Capabilities

### New Capabilities

- `error-monitoring`: フロントエンド / Edge Function の未捕捉例外を一次情報で収集し、PII 除去フィルタを経由して環境別に Sentry へ送出する基盤。サンプリング率・アラート閾値・PII フィルタ規約を spec として固定する。

### Modified Capabilities

（変更なし。`env-management` の envDir 契約に乗って新規環境変数を追加するだけで、spec レベルの要件変更は発生しない）

## Impact

- **追加コード**: `apps/{lp,admin,reservation}/src/main.ts` に Sentry 初期化、`supabase/functions/_shared/sentry.ts` に HTTP API 直送ラッパー
- **環境変数追加**: 各アプリ向け Sentry DSN（VITE_ プレフィックス）と Edge Function 向け DSN（service-side）
- **依存追加**: `@sentry/vue`（フロント 3 アプリ）。Edge Function は SDK を入れず HTTP API 直送のため依存追加なし
- **ドキュメント更新**: `docs/06-品質・セキュリティ/07-ロギング方針.md` §監視・モニタリング連携 を「将来対応」から実運用ルールへ昇格
- **外部サービス**: Sentry SaaS アカウントを新設（無料 Developer プラン、5K errors/month）
- **対象外**: APM 詳細チューニング、ソースマップアップロード、Supabase Log Drain 連携（必要なら別 Issue）
