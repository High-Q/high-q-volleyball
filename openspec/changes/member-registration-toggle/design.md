## Context

新規会員登録は reservation アプリ専用で、入口 `/signup`（公開）→ `/signup/verify` → `/signup/identity` の 3 段階。サーバー側の実体は 2 つの Edge Function:
- `request-signup`: 認証コードを発行しメール送信（会員はまだ作らない）
- `verify-signup`: コード照合成功時に `auth.users` + `members` を service_role で実作成

現状、グローバル設定テーブルも admin 設定画面も存在しない。新規登録を止める手段が無く、止めるにはコード変更＋デプロイが必要。オーナーが育児休暇で運営を離れる間、不在でも落ち着いて「停止／再開」を切り替えられる運用スイッチが要る。幹事代理が運営を担うが、admin はオーナー専用のため、スイッチの主たる操作者はオーナー（育休入り前に停止・復帰時に再開）を想定する。

## Goals / Non-Goals

**Goals:**
- 管理者が新規会員登録の受付を停止／再開できる、runtime で可逆なトグルを提供する（再デプロイ不要）。
- 停止中は新規会員が**絶対に作られない**ことをサーバー側で保証する（フロントの出し分けは補助）。
- 停止の影響範囲を新規登録フローに限定し、既存メンバーの運営継続機能には一切波及させない。
- 将来の運用トグルの受け皿となる最小の設定基盤を用意する（ただし今回の項目は 1 つのみ）。

**Non-Goals:**
- 幹事代理への admin アクセス付与（本 change のスコープ外。別途必要なら別 Issue）。
- 既存会員の招待・紹介制・定員上限など、受付の高度な制御（今回は単純な ON/OFF のみ）。
- 複数設定項目や設定履歴の監査ログ（YAGNI。1 項目 + 最終更新者のみ）。
- 再開予定日の自動スケジューリング（手動トグルのみ）。

## Decisions

### D1: 設定の保持は 1 行運用の `operational_settings` テーブル

運営グローバル設定を 1 行だけ持つテーブルを新設する。カラムは受付可否フラグ（`member_registration_enabled boolean not null default true`）＋最終更新時刻＋最終更新者。単一行制約は主キーを固定値に縛る方式（例: `id boolean primary key default true check (id)`）で担保し、migration で初期 1 行を seed する。

- **なぜテーブルか（env var でなく）**: runtime で可逆に切り替えたい。Vite フロントは build-time env のため env だと再ビルドが必要で「スイッチ」にならない。Edge Function 側も secret 変更の反映手順が要る。DB フラグなら admin から即時切替・即時反映。
- **なぜ 1 行 singleton か**: グローバル設定なので対象は 1 つ。将来項目が増えてもカラム追加で対応し、行は増やさない。
- `supabase/templates/new_table.sql` を出発点とし、anon / authenticated / service_role の 3 ロールへ明示 GRANT、RLS 有効化、`-- ROLLBACK:` コメントを含める（CLAUDE.md Pillar 4 準拠）。

### D2: 書き込みは admin のみ、読み取り経路はロール別に 2 系統

- **admin（authenticated かつ role='admin'）**: RLS で SELECT / UPDATE を許可。トグル画面で現在値を読み、更新する。
- **サーバー（service_role / Edge Function）**: テーブルを直接読む。これが受付可否の権威ある判定点。
- **新規登録しようとする匿名ユーザー（anon）**: テーブルを直接見せない。`SECURITY DEFINER` 関数 `public.registration_open() returns boolean` を anon / authenticated に EXECUTE 許可し、フラグ 1 bit だけを公開する。

- **なぜ関数経由で anon に公開するか**: 設定テーブルを anon に素の SELECT で開放すると、将来追加する別フラグも芋づるで露出しうる。必要なのは「今、受付中か」の 1 bit だけなので関数で最小露出に絞る（venues の public select とは露出粒度の要件が異なるため踏襲しない）。

### D3: 強制はサーバー側（Edge Function）、UI は補助

受付停止の保証は `request-signup` と `verify-signup` の**両方**の入口で行う。各関数の冒頭で受付可否を判定し、停止中は専用エラー（`registration-suspended`, HTTP 503）で即座に拒否する。判定は `_shared` の共通ヘルパに切り出す。

- **なぜ両方か（verify だけでなく）**: 会員が実際に作られるのは `verify-signup` なのでここが絶対防衛線。`request-signup` も止めることで、停止中に無駄なコードメールを送らず、早期に明確なエラーを返せる（多層防御）。
- **なぜ UI だけで隠さないか**: フロントの出し分けは API 直叩きで抜けられる。「新規会員が作られない」の保証はサーバー側にしか置けない。

### D4: フェイルセーフの向きは「サーバーは閉、UI は開」

- **Edge Function（権威判定）はフェイルクローズ**: フラグ読取に失敗したら「停止中」とみなして 503。理由: このスイッチの目的は不在期間に確実に止めること。読取失敗で「開きっぱなし」になるとキルスイッチの意味が無い。フラグ読取は members と同一 DB の単一行 index 参照のため、ここが落ちる時は登録処理自体も成立しない公算が高い。読取失敗は error monitoring に送って可観測にする。
- **フロント（UI 表示）はフェイルオープン**: `registration_open()` の読取に失敗したらフォームを表示する（＝誤って門前払いしない）。真の可否は submit 時に Edge Function が権威判定するため、UI が一時的に開いて見えても保証は揺らがない。

- **なぜ向きを分けるか**: 「正規の新規会員を一時的な DB ブリップで誤って追い返す」コストを UI 側で避けつつ、「不在中に 1 人すり抜ける」リスクをサーバー側で封じる。両者のリスク非対称に合わせた。

### D5: admin は「運営設定」ページ + トグル、切替時に確認ダイアログ

admin に設定ルート + 設定ページを新設し、受付可否トグルを置く。最も近い既存実装テンプレは announcement-template 一式。トグル UI は機能系プリミティブ（shadcn-vue の Switch）を `apps/admin/src/shared/ui/` に新規取り込み（現状 Input / Label / FormField のみ取込済のため追加）。

- 誤操作防止のため、状態変更時は ConfirmDialog を挟む（「新規会員登録を停止します。よろしいですか？」/ 再開も同様）。確定で永続化。
- 4 状態を持つ: Loading（現在値取得中）/ Error（取得・更新失敗）/ Success（切替完了トースト）/ 通常（トグル表示）。
- admin-shell のナビゲーションに「運営設定」導線を追加。パンくず・ページヘッダは既存規約に従う。

### D6: reservation `/signup` に「受付停止中」状態

`SignupPage` はマウント時に `registration_open()` を参照し、停止中はフォームの代わりに案内カードを表示する（Kicker + 本文 + `/login` への導線）。文面は再開の確定日を持たせず「現在、新規会員登録を一時停止しています。再開まで今しばらくお待ちください」を既定とする。`/signup/verify` は、停止中に進行中コードで来た場合、Edge Function の 503 を受けて同趣旨の案内に切り替える。

## Risks / Trade-offs

- **[admin はオーナー専用のため、幹事代理は自分で再開できない]** → 本 change の運用前提（不在中は停止固定、復帰時にオーナーが再開）と一致。本番 admin はデプロイ済のためオーナーは外出先からでも切替可能。幹事代理に操作権を渡す要件が出たら別 Issue で admin アクセス設計を扱う。
- **[サーバーのフェイルクローズで、平常時の一時的 DB ブリップが正規登録を 503 で弾きうる]** → フラグ読取は同一 DB の単一行参照で、落ちる時は登録自体が不成立の公算。読取失敗を error monitoring に送り可観測化。UI 側はフェイルオープンで誤門前払いを避ける。
- **[停止切替時に進行中の pending コードが残る]** → 会員作成は `verify-signup` で止まるため新規会員は発生しない。pending 行は TTL 30 分で自然消滅。
- **[影響範囲の漏れ（既存機能へ波及）]** → 判定点を signup 系 Edge Function 2 つと `/signup` ページに限定。ログイン用マジックリンク（`send-magic-link` 系）・予約・退会・本人確認は別経路で一切触らない。Apply 最終確認で既存メンバー動線の回帰を確認。

## Migration Plan

- migration は default `member_registration_enabled = true` で seed するため、デプロイ時点では挙動不変（受付継続）。オーナーが admin から任意のタイミングで停止へ切替。
- prd 反映は migration を含む PR を merge → CI apply job が承認ゲート（environment prd-db-push）経由で適用。Edge Function は別途 prd へ deploy が必要（Render 自動範囲外）。ship 時に承認まで見届ける。
- **Rollback**: `operational_settings` テーブルと `registration_open()` 関数を drop、Edge Function / UI の判定を revert（migration に `-- ROLLBACK:` 明記）。テーブル既定値が true のため、revert せずともフラグを true に戻せば受付は再開する。

## Open Questions

- 「受付停止中」案内（`/signup`）の最終文面（再開時期を仄めかすか否か）。既定は確定日を出さない中立文面。Apply 時に翔太郎くんへ確認する。
- 公開 LP / 会員向けの周知は本 change では扱わず、別途新設する汎用「お知らせ」機能（複数 + 掲載期間）で本件を掲載する。
