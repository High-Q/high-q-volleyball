## Context

江東区スポーツネット（`yoyaku.koto-sports.net`、指定管理者：江東区健康スポーツ公社）の土日祝・バレーボール可能枠は人気でキャンセルが頻発するが、手動巡回では取り逃す。本設計は「定期照会 → 差分検知 → オーナーへ LINE 即通知」を、費用ゼロ・既存 Supabase 基盤の延長で実現する。

前提の現状:
- 既存の通知系はすべて **Edge Function**（`send-*` / `promote-waitlist`）で実装され、`service_role` は Edge Function 内に閉じている。
- 既存のスケジュール実行は **GitHub Actions scheduled workflow**（`backup-prd.yml`）が唯一の実績。pg_cron はまだ未導入。
- 通知手段は Issue の「LINE Notify」が終了済みのため **LINE Messaging API**（承認済み）を使う。
- **対象サイトの技術特性（素 HTML か SPA か / 空き照会のログイン要否 / 照会リクエスト列）と robots.txt・利用規約は未確認**。ここが設計の分岐と GO/NO-GO を握る。

## Goals / Non-Goals

**Goals:**
- 土日祝・バレー可能枠に空きが出たら、会場名 / 日時 / 予約 URL をオーナーの LINE へ即プッシュ
- 同一空き枠の重複通知を防ぎ、いったん埋まって再度空いたら再通知する
- crawl 失敗を Sentry で観測でき、通知が静かに止まらない
- crawl コア（スケジュール・差分・通知・失敗記録）と施設アダプタ（江東区固有の照会・パース）を分離し、Bumb 用に再利用可能にする
- 実装前に規約ゲートを通す（robots.txt / 利用規約で自動アクセスが許容されることを確認、禁止なら中止）

**Non-Goals:**
- 自動予約（通知のみ）
- 平日枠 / 江東区以外の施設 / 会員向けの空き枠表示
- メール等 LINE 以外の通知チャネル

## Decisions

### 決定 0（ゲート）: 実装前に robots.txt / 利用規約を確認し、禁止なら中止する
- **理由**: 自治体系予約システムは規約で自動アクセス・スクレイピングを禁じている例が多い。禁止されたサイトを crawl するのはコンプライアンス・レピュテーション両面で許容できない。これは実装の第一タスク（spike）として置き、結果を記録する。
- **判定**: robots.txt の `Disallow` と利用規約の「自動アクセス／プログラムによる収集の禁止」条項を確認。明確に禁止なら本変更を**中止して報告**。曖昧なら低頻度・低負荷（下記）で許容範囲に収める。
- **代替案**: 「確認せず実装」→ コンプライアンス上却下。

### 決定 1: crawl コアと施設アダプタを分離する
- **構成**: `_shared/crawler/` に施設非依存のコア（差分検知・重複排除・通知整形・失敗記録・politeness 制御）を置き、`adapters/koto-sports/` に江東区固有の「照会リクエスト列・HTML/JSON パース・対象体育室/バレー種目の同定」を置く。アダプタは「対象日リスト → 空き枠リスト」を返す純粋関数に寄せる。
- **理由**: Epic #285 が「共通 crawler 基盤として設計し Bumb で再利用」を要求。施設ごとに変わるのは照会手順とパースだけなので、そこをアダプタ境界にする。
- **代替案**: 江東区専用に密結合実装 → Bumb で二重実装になり却下。

### 決定 2（spike で確定）: crawl 実行ランタイム — 素 HTML なら Edge Function、SPA なら GitHub Actions + Playwright
- **一次案（推奨・素 HTML かつログイン不要を想定）**: Supabase **Edge Function**（Deno）で `fetch` + HTML パース。既存通知系と同じ場所・同じ秘密管理（Supabase Secrets）に載り、`service_role` も露出しない。
- **フォールバック（SPA / JS レンダリング必須と判明した場合）**: **GitHub Actions scheduled job** で Node + Playwright（本リポジトリは E2E で Playwright 実績あり）。この場合 dedup state は同じテーブルを service_role で読み書きし、LINE push も Node から送る。
- **切替基準（spike の産物）**: 空き状況が (a) 素の HTML / 公開 JSON エンドポイントで取れる → Edge Function、(b) JS 実行後にしか描画されない or 複雑なセッション遷移が必須 → Playwright。
- **理由**: Deno Edge Function はヘッドレスブラウザを積めないため SPA では詰む。逆に素 HTML なら Edge Function が最小構成。実サイト未確認のため一次案を推奨としつつ spike で確定する。
- **代替案**: Render Cron Job → 有料で費用ゼロ方針に反するため却下。

### 決定 3: スケジューラはランタイムに従属させる
- **Edge Function 経路**: **pg_cron + pg_net** で 20 分間隔に `net.http_post` で Edge Function を叩く（Supabase ネイティブ、GitHub Actions 分を消費しない）。migration で cron ジョブを登録。
- **Playwright 経路**: **GitHub Actions `schedule`**（cron）で Node スクリプトを直接実行。
- **頻度**: 20 分間隔を既定とする（キャンセル枠の即時性と、サイトへの負荷・規約順守のバランス）。robots.txt に `Crawl-delay` があれば従う。
- **理由**: 二重のスケジューラ基盤を持ちたくないので、ランタイムが決まればスケジューラも一意に決まる。
- **代替案**: 常時両方 GitHub Actions に寄せる → Edge Function 経路でも GitHub 分を使うのは無駄。pg_cron に寄せる → Playwright を pg_cron からは実行できない。

### 決定 4: 重複通知防止は「通知済み空き枠テーブル」で reconcile する
- **テーブル**: `court_availability_notifications`（仮）に、通知した空き枠の署名（施設 / 体育室 / 日付 / 開始 / 終了）と通知時刻を記録。
- **アルゴリズム**: 各 crawl で「現在空いている枠」を集合 A、「テーブルにある通知済み枠」を集合 B とし、
  - `A - B`（新規に空いた枠）→ 通知して B に追加
  - `B - A`（もう空いていない = 埋まった枠）→ B から削除
  これにより「一度埋まって再度空いた枠」は自動的に再通知される（再オープンは新たな会場確保チャンスなので通知したい）。
- **対象の絞り込み**: 過去日・当日直近（最小リードタイム未満）は通知対象外。土日祝のみ。バレー種目のみ。
- **理由**: 状態を最小限（現在通知中の空き枠だけ）に保ちつつ、再オープン再通知という運用上望ましい挙動が自然に出る。
- **代替案**: 「一度通知したら二度と通知しない」永続ログ → 再オープンを取り逃すため却下。

### 決定 5: LINE Messaging API でオーナーへ push、秘密情報は Secrets 管理
- LINE 公式アカウント（プロバイダ + チャネル）を新規作成し、channel access token と送信先（オーナーの user ID）を **Supabase Secrets**（Edge Function 経路）/ **GitHub Secrets**（Playwright 経路）に格納。コードにハードコードしない。
- 通知本文は会場名 / 日時（土日祝・曜日つき）/ 予約 URL を含むテキストメッセージ。複数枠は 1 メッセージにまとめて無料枠（月 200 通）を節約。
- **代替案**: メール（既存 nodemailer）→ 会場確保のスピード要件でプッシュに劣るため今回不採用（承認済み）。

### 決定 6: 失敗は Sentry に記録し、通知パイプラインは静かに落とさない
- 到達不可 / HTTP エラー / パース不能（レイアウト変化でセレクタが取れない等）を Sentry に送る（既存 `error-monitoring` 基盤を使用）。
- 1 回の crawl 失敗で即アラートは煩いので、レイアウト変化系（パース 0 件が継続）は特に検知したい。連続失敗の扱いは実装で調整。
- **代替案**: 失敗握りつぶし → サイト改修に気づけず「通知が来ない = 空きが無い」と誤認するため却下。

## Risks / Trade-offs

- **[利用規約で自動アクセス禁止だった]** → 決定 0 のゲートで実装前に中止。曖昧なら低頻度・単一施設・最小リクエストで負荷を抑える。
- **[サイトが SPA / セッション遷移が複雑でパースが重い]** → 決定 2 のフォールバック（Playwright）へ切替。spike で早期に判明させる。
- **[サイトの HTML 構造が変わりパースが壊れる]** → 決定 6 で「パース 0 件継続」を Sentry 検知。アダプタ層だけ直せばよい構造にしておく。
- **[LINE 無料枠 200 通/月を超える]** → 複数枠を 1 通にまとめる。空き枠は少量想定のため通常は収まる。超過が続けば頻度を落とす or サマリ通知化。
- **[誤検知で夜間に連続通知]** → 20 分間隔 + reconcile による重複排除 + 最小リードタイムで抑制。
- **[pg_cron / pg_net 未導入で有効化が必要]** → 一次案採用時は拡張有効化を migration に含める。フォールバック採用時は不要。

## Migration Plan

1. **spike（決定 0・2）**: robots.txt / 利用規約を確認（GO/NO-GO）。GO なら空き照会のリクエスト列・レスポンス形式・体育室/バレー種目 ID を実地調査し、Edge Function 経路 / Playwright 経路を確定。
2. `court_availability_notifications` テーブル migration（RLS + 3 ロール GRANT、`new_table.sql` 起点）。dev に適用し `verify_grants.sql` で権限確認。
3. crawl コア + 江東区アダプタ実装（TDD: パースと差分 reconcile はユニットテスト対象）。
4. LINE 公式アカウント作成 + Secrets 登録（token / 送信先 user ID）。
5. スケジューラ結線（pg_cron 登録 or GitHub Actions schedule）。
6. dev で end-to-end 動作確認（既知の空き枠で通知が届く / 重複が出ない / 失敗が Sentry に出る）。
- **ロールバック**: cron ジョブ停止（unschedule / workflow 無効化）で crawl 即停止。テーブルは `-- ROLLBACK:` の DROP 手順を migration に記載。

## Open Questions

- 空き照会はログイン不要で取得できるか（不要なら大幅に簡素化。要ログインなら区内登録アカウントの資格情報を Secrets で持つ必要があり、規約・運用の追加検討）→ spike で確定。
- 「バレーボール利用可能な体育室」の具体的な対象施設・室・種目 ID の列挙 → spike で確定し、アダプタの設定として持つ。
- 祝日判定の実装（祝日 API / 静的テーブル / ライブラリ）→ 実装時に軽量な方法を選ぶ。
- 最小リードタイム（何時間前までの枠を通知するか）の既定値 → 運用しながら調整。
