## Context

LP 刷新 (#160) でイベントカードと最終 CTA は reservation サイトの URL を指す。LP 側は識別子を URL に乗せて渡すのみで、認証分岐は reservation 側の責務。

現在の reservation auth guard (`apps/reservation/src/app/router.ts`) は未認証時に `return { name: "login" }` するだけで、元の遷移先を破棄する。会員登録経路 (`/signup` → `/signup/verify` → `/signup/identity`) も画面遷移ごとに query を引き継いでおらず、最終 navigate 先は `/` 固定である。

Supabase Auth のマジックリンクは `signInWithOtp({ emailRedirectTo })` で戻り先 URL を指定でき、Site URL ホワイトリストは origin 単位で機能するため、`/auth/callback?next=<encoded>` は追加設定なしで動作する。

ステークホルダー:

- LP 訪問者 (未認証で `/events/<id>` に到達するケース)
- LP 経由の新規会員 (`/signup` 全段階を踏むケース)
- LP 経由の既会員 (`/login` 経由)
- LP 経由の認証済み会員 (guard 通過後に直接到達)

## Goals / Non-Goals

**Goals:**

- LP からの `/events/<id>` 到達後、未認証ユーザーがログインまたは会員登録を完了した時点で `/events/<id>` に自動到達する
- マジックリンクメールを別タブ・別端末で開いた場合でも `next` が維持される (クエリでメールに乗せる)
- `next` クエリの open redirect 攻撃を共通ヘルパで遮断する
- 不正 / 非公開イベント ID は EventDetailPage の既存「該当なし」状態に着地する (新規エラー画面は作らない)

**Non-Goals:**

- LP 側 CTA / カード差し替え (#160)
- 入口専用ルート (`/events/:id/book` 等) の新設
- ログイン後に予約 Bottom Sheet を自動展開する挙動
- メール / プッシュ通知 / SMS
- `event` クエリ形式 (`/?event=<id>`) のサポート (`/events/<id>` パスに統一)
- 新規 capability の作成 (既存 `app-routing` / `reservation-member-auth` の delta で完結)

## Decisions

### 入口 URL は既存 `/events/:id` を流用

Issue #229 完了条件には `/events/:eventId/book` も候補として挙がっているが、既存 router にすでに `/events/:id` ルートがあり、詳細画面 → 「予約に進む」ボタン → Bottom Sheet という UX (`reservation-events-and-booking` / `reservation-booking-flow` capability) は MVP1 で確立済み。

LP からは既存 `/events/:id` をそのまま指せばよく、新規ルート追加は SoC を崩す。詳細画面に到達したユーザーは内容を確認してから「予約に進む」を能動的に押す方が自然 (内容確認なしの自動シート展開は localStorage create モード復元との衝突リスクもある)。

**Alternative considered:** `/events/:id/book` を新設し、認証後に詳細画面 + Bottom Sheet 自動展開。却下: UX 一貫性を崩す上、追加ルートは保守コストを増やす。

### `next` クエリでの持ち回し (vs sessionStorage)

`next` クエリパラメータ方式を採用。

- マジックリンクメール経由で別タブ・別端末で開いた場合でも URL に乗っていれば確実
- Supabase の `emailRedirectTo` は任意 origin 内 URL を受けられるため、`/auth/callback?next=<encoded>` で完結
- signup 3 段階 (`/signup` → `/signup/verify` → `/signup/identity`) の遷移は `router.push({ name, query: { next } })` で引き継ぐ

**Alternative considered:** sessionStorage に保持。却下: マジックリンクで別ブラウザに移ると消える。クエリ方式の方が信頼性が高い。ハイブリッドは複雑性に対し効果が薄い。

### open redirect ガードを共通ヘルパに集約

`shared/lib/safeNextPath` 関数で `next` 値を検証し、guard / login / signup / signup-verify / signup-identity / auth-callback の各所から参照する。

判定: パス記法 (`/...`) のみ受理、`//` (protocol-relative)・絶対 URL・制御文字・`/login` / `/auth/*` / `/signup` / `/signup/*` への循環を全て却下。

**Alternative considered:** 各画面で個別に正規表現で判定。却下: 抜けが発生しやすい。共通化が安全。

### 不正 ID の扱いは既存挙動を流用

guard 段階では ID の妥当性を判定しない。認証完了後に EventDetailPage がマウントされ、データ取得失敗時に既存の「該当なし」状態 (一覧へ戻る導線) が描画される。

**Alternative considered:** guard で事前に events テーブルを SELECT して非公開 ID なら一覧へ。却下: guard で API を叩くと初回遷移が遅くなる。詳細画面の既存 4 状態 UI で十分。

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| `next` クエリの open redirect 攻撃 | `safeNextPath` 共通ヘルパで多層判定し、外部 origin・protocol-relative・認証導線循環を遮断 |
| signup 3 段階のいずれかで `next` を引き継ぎ忘れる | 段階ごとに component test を整備し、CI で navigate 引数の検証を強制 |
| マジックリンク URL が長くなり一部メーラーで折り返される | `next` は短いパス (`/events/<uuid>`) のみのため許容範囲。実害が出た場合は短縮ハンドル導入を別 Issue で検討 |
| Supabase Site URL ホワイトリスト変更が必要になる | `next` は origin に対する path 部分なので Site URL は origin 単位の既存設定のままで動作する。設定変更不要を確認済み |
| 認証済みユーザーが古い `/login?next=...` のリンクを踏む | guard が `/login` → `/` リダイレクト時に `next` を尊重して直接 `next` 先へ飛ぶ仕様で対応 |

## Migration Plan

- DB 変更なし、環境変数追加なし、Supabase 設定変更なし
- 既存セッション・既存ブックマーク (`/login` 単体) は挙動変更なし (`next` 未指定時は既存と同一)
- LP 側 (#160) のリリースタイミングと独立してデプロイ可能
- ロールバックは PR revert で完結 (`next` 未指定時の既存挙動を維持しているため副作用なし)

## Open Questions

なし。LP 側 (#160) と協調するため LP リリース前にマージしておくのが望ましい。
