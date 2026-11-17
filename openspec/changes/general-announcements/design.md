# Design: 汎用お知らせ機能（general-announcements）

> **承認ゲート**: Proposal と同時生成。Proposal + Design + Task の 3 ファイルをすべて承認後に Apply へ進む。

## 0. コンテキスト確認（Apply 開始前に必ず実施）

> Apply 開始時に Claude が宣言すること:
> 「project.md と本 design.md を読み直しました。現在の進捗: X/N タスク完了。技術制約: [要約]」

## Context

お知らせを出す基盤が現状どこにも無い。周知は 1 件ごとにコード変更＋デプロイが必要で、オーナー不在時は実質不可能。#393 は周知を本機能へ明示的に委譲している（`archive/2026-11-16-member-registration-toggle/proposal.md:10`, `design.md:83`）。

関連資産と流儀（調査済み）:
- **DB**: `operational_settings`（単一行 + 3 ロール GRANT + RLS）と `venues`/`events`（anon 公開 SELECT `using(true)`）が土台。`public.is_admin()`（`init_high_q.sql`）と `public.set_updated_at()` トリガー関数が既存で再利用可能。
- **admin**: TanStack 不使用。`Result<T, FetchError>` + 自前 composable + `useToast`。複数レコード CRUD の先例は events（ページ型）と venues（単一画面マスター・ディテール型）。フォームは `shared/ui/FormField` でラップ必須（生 label+input 禁止）。日付入力はネイティブ `<Input type="date">`（専用 DatePicker は未取込）。
- **LP**: Supabase + TanStack Query 稼働中（project.md の「AWS/DynamoDB」は旧記述）。`entities/<e>/api/*Queries.ts` の `queryOptions` → widget composable で `useQuery`。公開トップは `pages/home/ui/HomePage.vue`（vue-router 不使用・section 縦積み）。
- **予約**: TanStack 不使用（自前 composable: ref + reload）。会員ホームは実質 `pages/EventsListPage.vue`（`/events`）。条件付き告知帯の先例が `widgets/correction-request-panel`。

## Goals / Non-Goals

**Goals:**
- オーナーがコードに触れず、掲載期間つきの複数お知らせを admin から出し入れできる。
- 掲載期間内かつ対象サイトのお知らせだけが、LP（公開）と予約（会員）に自動表示される。
- 掲載前・掲載終了後の行を admin 以外へ漏らさない安全境界を RLS で担保する。
- 各アプリは自アプリの既存データ取得流儀に合わせ、新規依存を持ち込まない。

**Non-Goals:**
- 種別・重要度による装飾差（色・アイコン）、リッチテキスト／画像／リンクボタン、既読管理、個別配信、プッシュ／メール通知。いずれも YAGNI として MVP1 から外す。
- `admin-announcement`（LINE/X 告知文コピー）との統合・共有。別概念・別テーブルとして扱う。

## Decisions

### D1: 複数行の `announcements` テーブルを新設

列（確定値は tasks.md）: 識別子 / タイトル / 本文 / 出す相手（audience）/ 掲載開始（必須・既定 now）/ 掲載終了（任意 null = 無期限）/ 作成者 / 作成・更新時刻。`operational_settings` の単一行制約は持たせない（複数お知らせが要件）。`set_updated_at()` トリガーを再利用。`-- ROLLBACK:` コメント必須。

- **なぜテーブルか**: 掲載を runtime で可逆に出し入れしたい。LP/予約は build-time env のビルドのため env 方式では「掲示板」にならない。

### D2: 出す相手（audience）を 3 値で持つ

`public`（公開サイト向け）/ `members`（会員向け）/ `all`（両方）。既定は運用判断だが、最初の実利用（受付停止の周知）が来訪者向け＝ `public` のため、既定を機械的に `all` とはしない（admin で明示選択させる）。

- **なぜ出し分けるか**: 受付停止の周知は既存会員には無関係で、むしろ会員トップに出すとノイズ。逆に会員向けの運用連絡を公開 LP に出すのは不適切。「出す相手」は本機能の中核価値。
- **代替案（却下）**: 常に両方に出す（column を持たない）。→ 動機となる最初のユースケースを満たせず、後付けは RLS 変更を伴うため先に入れる。

### D3: 掲載期間は RLS の安全境界、audience も RLS で分離

公開読取の可否は **RLS で担保**する（クライアントのクエリ条件は補助）。

- **anon（LP）**: `audience in ('public','all')` かつ掲載期間内の行のみ SELECT 可。
- **authenticated 一般会員（予約）**: `audience in ('members','all')` かつ掲載期間内の行のみ SELECT 可。
- **authenticated かつ admin**: 全行 SELECT 可（掲載前・終了後・全 audience）。INSERT / UPDATE / DELETE も admin のみ。
- GRANT: anon = SELECT / authenticated = SELECT,INSERT,UPDATE,DELETE（行は RLS で制御）/ service_role = ALL。

- **なぜ RLS で境界を引くか**: 「掲載前の下書き」「終了したお知らせ」「会員限定の連絡」を URL 直叩き・匿名クライアントから覗けないようにするのはサーバー側にしか置けない。`venues` の素の `using(true)` は踏襲せず、掲載期間・audience 条件を USING に書く。
- **掲載期間の判定**: `publish_start <= now()` かつ（`publish_end is null` または `now() < publish_end`）。`now()` は absolute time のため端末 TZ に非依存。終了は排他的上限。

### D4: 掲載期間の入力粒度は「日付」、保存は timestamptz

admin の入力はネイティブ `<Input type="date">`（専用 DatePicker 未取込のため新規コスト 0）。選んだ日付を JST 境界に変換して timestamptz で保存する（開始日 = その日の JST 00:00 / 終了日 = 翌日の JST 00:00 を排他的上限にして「終了日いっぱい表示」）。終了日は空欄可（無期限）。

- **なぜ分単位にしないか**: お知らせに分刻みの精度は不要で、時/分 Select の追加はノイズ。日付粒度なら既存 Input だけで完結。
- **TZ 非依存の担保**: 比較は timestamptz vs `now()` の絶対時刻で行い、入力・表示の整形のみ JST 固定（端末 TZ を見ない）。

### D5: admin はマスター・ディテール 1 画面（venues 型）

`/announcements` 1 ルート + マスター・ディテール widget（左: お知らせ一覧＋掲載状態バッジ／右: 作成・編集フォーム）。保存・削除は `Result` + 自前 composable + `useToast`。削除は AlertDialog で確認（venues の `window.confirm` ではなく #393 / events の AlertDialog を踏襲）。フォームは `FormField` でラップ。

- **なぜ venues 型か**: 少数レコードの CRUD を 1 画面で完結でき、events の 4 ページ構成より軽い。既存の proven パターン。
- 掲載状態は保存値から導出（掲載予定 / 掲載中 / 掲載終了）。一覧はモバイルで `DataCardList` 併用（events 一覧の踏襲）。

### D6: LP 表示は既存 TanStack Query 基盤に、予約表示は既存 composable 基盤に

- **LP**: `entities/announcement/api/announcementQueries.ts`（`queryOptions`・`audience in ('public','all')` を anon で select）→ `widgets/announcement-banner` の composable で `useQuery` → `HomePage.vue` 最上部（Hero 近辺）に 1 行追加。既存 `event-list` の 4 状態実装が手本。
- **予約**: `entities/announcement`（自前 fetch 関数・`audience in ('members','all')`）＋ `widgets/home-announcements`（ref + reload composable）→ `EventsListPage.vue` の `HomeHeader` 直下に `CorrectionRequestPanel` と同列で差す。
- 両アプリとも**掲載対象が無い／取得失敗のときは静かに何も描かない**（非クリティカルな掲示のため fail-silent。ページ本体を壊さない）。

- **なぜ流儀を分けるか**: admin / 予約に TanStack を新規導入するのは本機能のためだけの過剰投資。各アプリの ESLint 境界・既存テスト資産に沿う方が安全。

## 2. ビジネス異常系の洗い出し

| # | 異常ケース | 扱い | ユーザーへのフィードバック |
|---|-----------|------|--------------------------|
| 1 | （admin）タイトル／本文が空 | フォーム側で保存不可 | `FormField` の error 表示（`role="alert"`） |
| 2 | （admin）終了日 < 開始日 | フォーム側で保存不可 | 「終了日は開始日以降にしてください」 |
| 3 | （admin）admin 以外が書込 | RLS が拒否（42501） | 「権限がありません」トースト（通常は到達しない） |
| 4 | （admin）通信失敗 | `NETWORK_ERROR` | 「通信に失敗しました。再試行してください」 |
| 5 | （admin）サーバーエラー | `SERVER_ERROR` | 「しばらくしてから再試行してください」 |
| 6 | （LP/予約）掲載対象 0 件 | Empty | 何も描画しない（静かにフォールバック） |
| 7 | （LP/予約）取得失敗 | Error | 何も描画しない＋ error monitoring に記録（ページは壊さない） |

**UI 表示方針**: admin はエラーコードで分岐し具体的に表示。「エラーが発生しました」だけは禁止。LP/予約の掲示はページ本体より優先度が低いため、異常時は黙って畳む。

## 3. UI/UX 設計

### FSD 影響レイヤー・スライス

- `apps/admin`: `entities/announcement`（型 + `Result` クエリ）/ `features/announcement-delete`（削除 AlertDialog）/ `widgets/announcements-master-detail`（一覧＋フォーム）/ `pages/AnnouncementsPage.vue` / `app/router.ts` / `widgets/admin-shell/model/navItems.ts`。
- `apps/lp`: `entities/announcement`（`queryOptions`）/ `widgets/announcement-banner` / `pages/home/ui/HomePage.vue`。
- `apps/reservation`: `entities/announcement`（自前 fetch）/ `widgets/home-announcements` / `pages/EventsListPage.vue`。
- `supabase/migrations`, `supabase/tests`。

### デザイントークン使用確認

- [ ] 色・spacing は HQ トークン（`var(--hq-*)` / Tailwind preset utility）経由。マジックナンバー禁止。
- [ ] admin は `@high-q/ui`（意匠系）+ shadcn-vue（機能系: `FormField`/`Input`/`Textarea`/`AlertDialog`）。LP は Vuetify / 既存 widget 流儀、予約は既存 widget 流儀に合わせる。

### 4 状態設計

| 面 | Loading | Empty | Error | Success |
|----|---------|-------|-------|---------|
| admin 一覧 | Skeleton | 「お知らせはまだありません」 | 再読込ボタン | 一覧＋掲載状態バッジ |
| admin フォーム | 保存中は送信無効化 | — | エラートースト | 保存成功トースト |
| LP 掲示 | 描画しない（本体優先） | 描画しない | 描画しない（記録のみ） | お知らせブロック表示 |
| 予約 掲示 | 描画しない | 描画しない | 描画しない（記録のみ） | お知らせブロック表示 |

### レスポンシブ対応

| ブレークポイント | admin 一覧 | LP/予約 掲示 |
|---------------|-----------|-------------|
| xs（〜599px） | `DataCardList`（カード） | 縦積み・全幅 |
| sm 以上 | テーブル／マスター・ディテール | コンテンツ幅に追従 |

モバイルファースト。本文は改行保持（`white-space: pre-wrap`）。

### アクセシビリティチェックリスト

- [ ] フォームは `FormField` で label 関連付け・error を `role="alert"` + `aria-describedby`。
- [ ] 削除 AlertDialog はフォーカストラップ・ESC クローズ。
- [ ] お知らせブロックは適切な見出し／ランドマーク（例: `<section aria-label="お知らせ">`）。
- [ ] コントラスト比 AA（4.5:1）以上。キーボード操作（Tab/Enter/ESC）が機能する。

## 4. DB / Supabase 設計

### 新規テーブル migration チェックリスト

- [ ] `supabase/templates/new_table.sql` を出発点にコピー。
- [ ] anon（SELECT）/ authenticated（SELECT,INSERT,UPDATE,DELETE）/ service_role（ALL）へ明示 GRANT。
- [ ] RLS 有効化。掲載期間・audience・admin 判定を USING/WITH CHECK に反映。
- [ ] `set_updated_at()` トリガーを張る（関数は既存を再利用）。
- [ ] `-- ROLLBACK:` コメント（revoke → drop policy → drop trigger → drop table）。
- [ ] `supabase/tests/verify_announcements_rls.sql` を `verify_operational_settings_rls.sql` 形式で新設し、Apply 後に検証。

### RLS ポリシー設計（必須）

| ポリシー | 操作 | 対象ロール | 条件（要点） |
|---------|------|-----------|-------------|
| public 読取 | SELECT | anon | `audience in ('public','all')` かつ掲載期間内 |
| authenticated 読取 | SELECT | authenticated | `is_admin()` または（`audience in ('members','all')` かつ掲載期間内） |
| admin 作成 | INSERT | authenticated | `is_admin()` |
| admin 更新 | UPDATE | authenticated | `is_admin()`（USING / WITH CHECK 両方） |
| admin 削除 | DELETE | authenticated | `is_admin()` |

具体 SQL は tasks.md。掲載期間条件: `publish_start <= now() and (publish_end is null or now() < publish_end)`。

### TypeScript エンティティとの整合

raw 行（snake_case: `publish_start` 等）→ 各アプリのドメイン型（camelCase: `publishStart` 等。時刻は ISO string）へ変換関数で写像。admin は `Result` を返す。識別子・audience は各アプリの流儀（admin は Branded Types / `Result` 慣習）に合わせる。

## 5. テスト設計

| 対象 | 種別 | ツール |
|------|------|--------|
| RLS（掲載期間・audience・admin 境界） | SQL 検証 | `verify_announcements_rls.sql` |
| admin `entities/announcement` クエリ（Result・エラー分類） | ユニット | Vitest |
| admin 削除 composable / フォーム composable（バリデーション） | ユニット | Vitest |
| LP `announcementQueries` + widget 4 状態 | ユニット | Vitest（既存 event-list 準拠） |
| 予約 お知らせ composable + widget | ユニット | Vitest |
| router / navItems の件数テスト更新 | ユニット | Vitest |

**正常系**
- [ ] admin が作成→一覧に反映→編集→削除できる。
- [ ] 掲載期間内の公開お知らせが LP に、会員お知らせが予約に出る。

**ビジネス異常系（セクション 2 と対応）**
- [ ] タイトル／本文空・終了日 < 開始日で保存不可。
- [ ] admin 以外の書込が RLS で拒否される。
- [ ] 掲載前・掲載終了後・対象外 audience の行が anon / 一般会員に出ない。

**技術エラー系**
- [ ] 取得失敗時、admin は Error 表示、LP/予約は描画せずページを壊さない。
- [ ] 掲載対象 0 件で Empty（LP/予約は非描画）。

## 6. ロギング設計

| 事象 | ログレベル | 含む情報 |
|------|-----------|---------|
| admin お知らせ作成／更新／削除成功 | `info` | 操作種別・対象 id（本文は含めない） |
| admin 書込のビジネス異常系 | `warn` | エラーコード |
| admin / LP / 予約の取得・保存の技術エラー | `error` | エラーコード・操作（個人情報除く） |

## Risks / Trade-offs

- **3 アプリ横断で面が広い** → DB → admin → LP → 予約の順で縦に積み、各面を独立検証。LP/予約は「掲示が出る／出ない／壊れない」に絞る。
- **audience / 掲載期間を RLS に書くため、クエリ条件とポリシーの二重管理になりうる** → 安全境界は RLS を正とし、クライアント条件は UX 上の絞り込み（例: 並び順・件数）に留める。RLS 検証 SQL で境界を担保。
- **admin の日付入力を JST 境界へ変換する実装のズレ** → 変換ロジックをユニットテストで固定（端末 TZ=UTC でも JST 基準になること）。
- **LP/予約で流儀が異なる二重実装** → entity 名は揃えつつ、取得層は各アプリの既存流儀に隔離。共通化は YAGNI。

## Migration Plan

- migration はデータ seed 不要（お知らせ 0 件で出発＝挙動不変）。
- prd 反映は migration を含む PR を merge → CI apply job が承認ゲート（environment prd-db-push）経由で適用。ship 時に承認まで見届ける。Edge Function は無いため関数 deploy は不要。
- **Rollback**: `announcements` テーブル・トリガー・ポリシーを drop（migration の `-- ROLLBACK:` に明記）。アプリ側は widget の非表示 revert で足りる（テーブルが空／無しでも fail-silent で壊れない）。

## Open Questions（Apply 前に翔太郎くんへ確認したい点）

1. **出す相手（audience）の既定値**: 新規作成時の初期選択を `public`（受付停止の周知想定）/ `members` / `all` のどれにするか。レム案 = 明示選択必須（初期未選択）または `all`。
2. **掲載期間の粒度**: 「日付のみ」で確定してよいか（レム推奨）。分単位が要るなら時/分入力を足す。
3. **種別・重要度の装飾差**: MVP1 では入れない（単一スタイル）で確定してよいか。「重要」だけ色を変えたい等あれば追加する。
4. **お知らせの最大表示件数・並び順**: 掲載中が複数ある場合、全件表示か上限ありか。レム案 = 掲載開始の新しい順に全件（少数前提）。
