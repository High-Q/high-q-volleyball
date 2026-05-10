## Context

Phase 1 の `reservation-member-auth` は Supabase Auth の `signInWithOtp({ shouldCreateUser: true })` を採用しており、メール送信時点で `auth.users` (unconfirmed) 行が作成される。その後、マジックリンク click → `/signup/profile` でプロフィール入力 → `members` UPDATE という 2 段階で会員登録を完成させる。この仕様の副作用として:

- メール送信後にメール無視 → `auth.users` unconfirmed + `members` placeholder 行が残る
- マジックリンク click 後にプロフィール入力で離脱 → `auth.users` confirmed + `members` placeholder 行が残る

Phase 1 では `members.profile.signup_completed` フラグで「完成判定」を実装し、別 Issue #190 で 48h cleanup ジョブを並行配備する設計だった。本 change はサービスIN前にこの設計を Edge Function + 自前 6 桁コード方式へ置き換え、未完成行が DB に**一切作られない**フローへ正規化する。

既存資産（`signup_completed` フラグ・auth guard・identity_documents Step 3・ニックネーム任意項目・PolicyFooter・利用規約同意の jsonb 保存・admin の上位互換扱い等）は維持する。差し替えるのは **新規 signup の作成タイミングと入力フォーム構成のみ** とする。

ログイン側の `signInWithOtp({ shouldCreateUser: false })` は中途滞留を発生させないため変更しない。

## Goals / Non-Goals

**Goals:**

- 新規 signup フローでは、**コード検証成功時にのみ** `auth.users` + `members` 行が作成される
- 中途離脱した会員候補の payload は最大 30 分で自動削除され、`auth.users` / `members` には何も残らない
- `members.profile.signup_completed` は「常に true」となり、未完成行のフィルタは不要となる
- 会員視点の体験は Phase 1 と同等以上（リンク開きに行く往復がなくなり、入力ページが 1 ページに集約される）
- 個人情報の一時保管は Supabase の特権ロール経由でのみアクセス可とし、クライアントから直接読み書きできない

**Non-Goals:**

- 既存会員のログインフローの変更（マジックリンクのまま据え置き）
- SMS 認証 / WebAuthn / Passkey の追加（Phase 2 以降の別 Issue）
- メール配信サービスの差し替え（Resend 導入は持ち込まない）
- 本人確認書類アップロード Step 3 の変更
- ニックネーム任意項目・利用規約同意・PolicyFooter 表記の変更
- admin ユーザーの認証フロー変更
- Phase 1 リリース後に既に滞留している `auth.users` / `members` 行の cleanup そのもの（本 change リリース時に **ワンショット SQL** で実行する手順を Migration Plan に含めるが、cron 化はしない）

## Decisions

### D1. 認証方式 = Edge Function + 自前 6 桁コード

**選択**: Supabase Auth の標準 OTP/マジックリンクには乗らず、Edge Function 2 本（コード発行と検証）+ 専用テーブル `signup_pending` で自前のフローを構築する。検証成功時のみ Supabase Auth の **admin API**（`supabase.auth.admin.createUser`）で `auth.users` を作る。

**Rationale**:

- `signInWithOtp` は仕様上、API 呼び出し時点で `auth.users` を作成する。これを回避する Supabase 標準の手段は存在しない
- admin API は Service Role キーを必要とするため、Edge Function（サーバ側）に閉じる必要がある
- 6 桁コードはユーザー側でリンクを踏まずに同一ブラウザで完結でき、スマホ↔PC 切替ユーザーも救える
- 公開鍵で読み取れる payload を持つ JWT 系の独自トークンを発行するより、サーバ側の KV テーブル + 短い数値コードのほうが実装の独立性と監査可能性が高い

**代替**:

- Supabase Auth の `signInWithOtp({ shouldCreateUser: false })` + 後続の手動 createUser: 既存会員判定が走り「未登録」エラーになるため使えない
- マジックリンク維持 + cleanup ジョブで運用: Phase 1 の妥協案。サービスIN前に解消する判断（Issue #189 起票理由）
- 自前トークン（JWT）方式: 失効管理・鍵管理が増え、KV 方式より複雑

### D2. 入力フォーム構成 = 1 ページ全項目集約

**選択**: `/signup` 1 ページに「氏名 / メール / 生年月日 / 電話 / 経験レベル / 任意ニックネーム / 利用規約同意」を集約する。コード送信成功で `/signup/verify` へ遷移し、6 桁コードを入力する。検証成功で会員登録が完成する。

**Rationale**:

- 2 段階（メール → コード検証 → プロフィール入力）に分けると「プロフィール入力で離脱」が再発し、ゼロ滞留要件と矛盾する
- 全項目を `signup_pending` に保持し、検証成功で一括 INSERT する設計が #189 の核心
- コード入力前に `/signup` フォームから戻れば 30 分以内なら同じメールアドレスで再送可能（`signup_pending` の同 email 行を上書き）

**代替**:

- メール先送信 → コード検証 → プロフィール入力（2 段階）: ゼロ滞留要件を満たさない
- メール + コード入力を同一ページに同居: メール送信前にコード入力欄を見せると UX 上ノイズが大きい

### D3. 一時 payload 保管 = `signup_pending` テーブル + TTL 30 分

**選択**: 認証コード待ち payload を保管する専用テーブル `signup_pending` を新設する。RLS で **service_role 以外のすべてのアクセスを禁止**し、TTL 30 分で自動削除する。

**列構成（design レベルの提示。具体型は tasks.md / migration で確定）**:

- `email` を主キー相当（同一メールでの再送は最新行で上書き）
- 入力 payload を jsonb で 1 列に集約（氏名 / 生年月日 / 電話 / 経験レベル / 任意ニックネーム / 利用規約同意タイムスタンプを含む）
- 6 桁コード（**ハッシュ化**して保管。原文を DB に置かない）
- 試行回数（連続誤入力で行をロック / 削除）
- 発行時刻 / 期限（30 分後）

**TTL 削除方式**: クライアントから明示的な削除は不要。検証成功時に Edge Function が DELETE する。期限切れ行は次の `request-signup` 呼び出し時に同 email の古い行を上書きで消化し、加えて検証 Edge Function が冒頭で「自分以外の期限切れ行」をベストエフォートで掃除する。pg_cron への依存はサービスIN時点では持ち込まない（Supabase の運用範囲内で完結させる）。

**Rationale**:

- TTL 30 分は「メールを開くまでの猶予 + 入力者が席を外す時間」を吸収する妥協点
- service_role 限定 RLS は Edge Function（サーバ側）からのみアクセス可能にすることで、payload に含まれる氏名 / 電話 / 生年月日が anon / authenticated の両方からブロックされる
- コードのハッシュ保管は、`signup_pending` の dump が漏れた場合でもコード原文を再構成できないようにする防御層

**代替**:

- Redis / KV ストア: 追加サービス契約が増える
- メモリ内保管: Edge Function インスタンス間で共有不能
- payload 自体を JWT に詰めてメール送信: メール本体に PII が乗るのが望ましくない

### D4. メール送信 = Gmail SMTP（既存運営アカウント `high.q.volleyball@gmail.com` を SMTP 中継として使う）

**選択（2026-05-11 翔太郎くん指示で改訂）**: 認証コードメールは High Q 運営の Gmail アカウント（`high.q.volleyball@gmail.com`）を SMTP 中継として使い、Edge Function から Deno 互換 SMTP クライアント（`denomailer` 等）経由で `smtp.gmail.com:465` (SMTPS) に接続して送信する。Google アカウントの「アプリパスワード」機能で発行した認証情報を Edge Function の secret に設定する。

**Rationale**:

- 翔太郎くん明示判断（2026-05-11）: 追加メールサービス契約を持ち込まず、既存の運営 Gmail を活用する
- 送信元アドレスがブランド統一（`high.q.volleyball@gmail.com`）でユーザー視点の信頼性が高い
- Resend / SendGrid のような追加 SaaS 契約・API キー管理が不要
- MVP1 想定の signup 流入量（数十件/月）は Gmail 無料枠の送信上限（500通/日）を大きく下回る
- 当初検討した「Supabase 組み込み SMTP」は実装段階で **Auth 関連メール専用で Edge Function からは利用不可**であることが判明したため不採用

**Rationale 補足（Supabase 組み込み SMTP が使えない理由）**:

- `supabase/config.toml` の `[auth.email.smtp]` は Supabase Auth が *自分で* メールを送る時の設定であり、Edge Function から共有して使う公開経路は存在しない
- `auth.admin.generateLink` 系 API は user 行を作る副作用を伴うため、ゼロ滞留要件と矛盾する

**運用前提**:

- Google アカウント側で 2 要素認証を有効化し、「アプリパスワード」を発行してもらう（翔太郎くんの作業）
- 発行されたアプリパスワード + 送信元アドレスを Edge Function の secret として登録（Supabase Dashboard）
- Edge Function 側は `denomailer` で `smtp.gmail.com:465` (SMTPS / TLS) に SMTP AUTH 接続して送信
- 同じ Gmail アカウントを Supabase Auth の SMTP プロバイダとしても登録すると、ログイン用マジックリンクメールも同送信元から発出され、ユーザー体験のブランド統一が図れる（任意・本 change のスコープ外で実施可）

**代替**:

- Resend（無料枠 100 通 / 月）: 採用見送り（翔太郎くん判断）
- SendGrid 無料枠: Resend と同様に追加契約が必要
- AWS SES: 認証手続きが重く、本フローに過剰

**注意点 / リスク**:

- Gmail SMTP の deliverability は Resend / SendGrid 等の専門サービスに比べると劣る可能性があり、受信側のスパム判定で迷惑メール扱いされるケースがありうる
- アプリパスワードの漏洩は Google アカウント全体の制御権限を奪われる重大事故につながる。secret 管理を厳格に運用する MUST（Edge Function env に置く・git にコミットしない・人に共有しない）
- 大量送信時（500通/日超）は Gmail がスロットリング / アカウント停止する可能性があるため、想定流入量を超える兆候があれば Phase 2 で Resend 等への切替を再検討する

### D5. ログインは現行マジックリンクを据え置き

**選択**: `/login` での既存会員ログインは Phase 1 の `signInWithOtp({ shouldCreateUser: false })` をそのまま維持する。本 change ではログイン側に手を入れない。

**Rationale**:

- ログインは `auth.users` を作成しないため中途滞留問題が発生しない
- 変更範囲を最小化して Phase 1 で動作検証済みのフローを保持する
- 翔太郎くん明示判断（2026-05-11）: signup のみコード化、ログインは据え置き

**代替**:

- ログインも 6 桁コード化して UX を統一: 工数増 + Phase 1 動作検証フローを変更するリスク。Phase 2 以降に判断保留

### D6. プロフィール完成判定の意味維持

**選択**: `members.profile.signup_completed = true` の判定は維持する。本 change 適用後、新規作成される `members` 行は INSERT 時点で常に `signup_completed: true` になるため、判定は事実上「常に true」となるが、admin の上位互換扱い・既存会員（Phase 1 で作成された行）との互換性のためフィールド自体は残す。

**Rationale**:

- Phase 1 で作成された会員行（既に `signup_completed: true` がセット済み）との互換性を保つ
- auth guard / プロフィール完成判定ロジック（`reservation-member-auth` の既存要件）を変更せずに済ませる
- admin（`role = 'admin'`）の上位互換ロジックも変更不要

**代替**:

- フラグ列削除: 既存会員行の互換性が壊れる + auth guard / 判定ヘルパーを書き換える必要がある

### D7. auth guard 簡素化（プロフィール未完成→ `/signup/profile` 強制誘導の撤廃）

**選択**: 「認証済み + プロフィール未完成 → `/signup/profile` 強制誘導」の guard 分岐は撤廃する。本 change 適用後は認証済みなら必ずプロフィール完成済みのため、当該分岐は理論上到達不能となる。`/signup/profile` ルート自体も削除する。

**Rationale**:

- 到達不能なコードを残すと将来の保守者を惑わせる
- `/signup/verify` は別系統のフロー（未認証状態での 6 桁コード入力）として独立して扱う

**代替**:

- 防御的に分岐を残す: 死にコードを抱えるコストが高い

### D8. Phase 1 滞留行のワンショット清掃

**選択**: 本 change リリース時に、Phase 1 期間に発生した `auth.users` unconfirmed / `signup_completed != true` の行を **ワンショット SQL** で削除する。`auth.users` の DELETE は `members` への ON DELETE CASCADE で連動する。実行手順は Migration Plan に含める。

**Rationale**:

- 本 change 適用後は新規滞留が発生しないため、cron 化の必要なし
- リリース直後に dev / prd 両環境で 1 回だけ実行すれば過去の滞留を一掃できる
- Issue #190 の cleanup ジョブ実装が不要になる根拠でもある

**代替**:

- 滞留行を残置: 本来不要なデータが恒久的に残る
- cron で日次清掃: 滞留が二度と発生しない設計のため過剰

## Risks / Trade-offs

- **[Risk] Edge Function の障害でメールコードが発行できない時、登録動線が止まる** → Edge Function の死活監視を本 change 内では追加しない（Supabase ダッシュボードのログで一次対応）。Phase 2 以降で監視追加を検討
- **[Risk] `signup_pending` の payload に PII が短時間でも入る** → service_role 限定 RLS + TTL 30 分 + コードのハッシュ化で多層防御。`localStorage` に payload を残す Phase 1 の暫定設計より露出時間が短い
- **[Risk] 6 桁コードのブルートフォース** → 試行回数を payload 行に保持し、N 回連続失敗で行を削除（再送が必要）+ Supabase 側の Edge Function 呼び出しレートリミットで抑制
- **[Risk] メールが届かない / 期限切れ** → 30 分以内に再送 CTA で同 email 行を上書きして再発行できる UI を持たせる
- **[Trade-off] 1 ページに項目が増える** → メール送信前に全項目を要求するため、フォーム長で離脱する候補は増える可能性。ただし、現行 2 段階でも結局全項目入力は必須であり、トータルの離脱率は同等以下と想定
- **[Trade-off] Issue #190 cleanup ジョブのために投じた設計時間が宙に浮く** → 本 change マージ後に #190 を Close 候補として再評価する。cleanup ジョブ実装が始まる前にこの change を完了させる順序が前提
- **[Trade-off] ログインと signup でメール導線が異なる（リンク vs コード）** → 翔太郎くん明示判断（2026-05-11）で受容。Phase 2 以降に統一可否を再検討

## Migration Plan

1. dev 環境で Edge Function 2 本 / `signup_pending` テーブル / RLS / Vue 画面差し替えを順にデプロイし、ハッピーパス + 期限切れ + 連続誤入力の 3 ケースを確認する
2. dev で Phase 1 滞留行のワンショット清掃 SQL を試走し、admin 行（`profile.signup_completed = true` を持つ行）が残ることを SELECT で検証する
3. PR を Render プレビューで動作確認 → master へマージ
4. 本番環境（prd）で Migration を適用し、ワンショット清掃 SQL を 1 回実行する
5. Issue #190 を Close 候補として再評価する（理想は同日中に Close 判定）

**ロールバック**:

- 本 change リリース後にクリティカル不具合が出た場合は、`/signup` の Vue ルートを暫定的に Phase 1 のマジックリンク版に差し戻す（git revert で対応）。`signup_pending` テーブルは残しておいて再前進時に再利用する
- Phase 1 滞留清掃 SQL の DELETE は ON DELETE CASCADE で `members` も連動するため、ロールバックは不可能。事前に dev で件数を SELECT して影響範囲を翔太郎くんに提示してから本番適用する手順を Migration ステップに含める

## Open Questions

- 6 桁コードの**試行回数上限**の具体値（例: 5 回 / 10 回）は tasks.md フェーズで確定する
- 同一メールアドレスからの**短時間再送レート**（例: 60 秒 / 5 分）は tasks.md フェーズで確定する
- `/signup/verify` 画面の戻る導線（メールアドレス変更の動線）の UI 詳細は tasks.md フェーズで確定する
