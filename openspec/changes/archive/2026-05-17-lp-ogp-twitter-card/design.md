## Context

LP は Vue 3 + Vite ベースの SPA で、`apps/lp/index.html` がエントリポイント。現行 `<head>` には旧 LP（Vuetify 初期版）由来の OGP メタタグが残っており、以下の問題を抱える。

- `og:image` が旧バンドル時代の Unsplash 写真の relative-ish URL を指しており、再構築後の `/images/hero.jpg` を反映していない
- `og:title` / `og:site_name` に「Hige Q」のタイポ
- `twitter:card` 系メタタグが未設定で、X 上では小さいカードか fallback 表示になる
- `<html lang="en">` で、日本語 LP にもかかわらず英語と宣言している

LP は静的 SPA のため、ルーターによる動的な head 書き換えは不要。Render Static Site としてビルド後の `apps/lp/dist/index.html` がそのまま配信される。SNS クローラーは JS 実行を保証しないので、メタ情報は **ビルド時に index.html に直書き** されている必要がある（Vue の `useHead` 等の動的 head 注入は SNS クローラには届かない）。

主要 SNS プラットフォームのカード生成挙動:
- **X**: `twitter:card="summary_large_image"` で 1.91:1 大画像カード。`og:` にもフォールバック対応
- **Facebook / Threads**: OGP のみ。推奨 1200×630
- **LINE**: OGP のみ。1200×630 推奨、トリミング挙動はクライアント依存
- **Slack / Discord**: OGP + 一部 Twitter Card 認識

## Goals / Non-Goals

**Goals:**
- 再構築後ブランドに揃った SNS シェアカードが X / Facebook / LINE / Slack 等で正しく描画される
- Hero ビジュアルが「リンクを貼った瞬間の第一印象」として SNS 上に届く
- メタ情報の不整合（旧画像参照 / タイポ / 言語属性）を一掃する
- マージ後の本番 URL に対して SNS Card Validator で目視検証できる

**Non-Goals:**
- ページごとに動的な OGP を出し分けること（LP は単一ページのため不要）
- カスタム OG 画像をビルド時に自動生成すること（手動運用で十分）
- 独自ドメイン対応・多言語化（本変更のスコープ外、将来の独自ドメイン移行時に絶対 URL を 1 箇所書き換える運用）
- LP 以外の `apps/admin` / `apps/reservation` の OGP 整備（管理画面と予約画面は SNS シェア対象外）

## Decisions

### 決定 1: SNS シェア専用画像を新規作成（Hero 画像の流用は不採用）

`apps/lp/public/images/og.jpg` を 1200×630px の専用画像として新規追加する。Hero 画像は構図的に縦方向の余白が大きく、SNS カードの 1.91:1 クロップで主題が見切れる可能性がある。

**代替案として検討:**
- A. `hero.jpg` をそのまま `og:image` に指定 → SNS 側のクロップ挙動が予測しづらく、X / Facebook で構図が崩れるリスク。却下。
- B. ビルド時に sharp 等で動的生成 → ビルドチェーンの複雑化に対して得るものが少ない。却下。
- C. **専用画像を手作業で 1200×630 に作成**（採用）→ Hero の構図を踏襲しつつ、SNS 想定の安全領域に主題を配置可能。

### 決定 2: 本番 URL は index.html に静的にハードコード

`og:url` / `og:image` / `twitter:image` の絶対 URL は、現行 Render Static Site の `https://high-q-volleyball.onrender.com` を `apps/lp/index.html` に静的に書く。

**代替案として検討:**
- A. Vite の `define` / 環境変数で動的注入 → SNS は本番 URL のみがシェアされるため、Preview / dev で動的差し替えする実益が薄い。複雑化に対するリターンが小さい。却下。
- B. **静的ハードコード**（採用）→ 将来独自ドメインに移行する場合も index.html の 3 行を書き換えれば完了。シンプル。

### 決定 3: 動的 head 注入（@vueuse/head 等）は導入しない

SNS クローラーは原則 JS を実行しない（X / Facebook / LINE の主要 fetcher は静的 HTML のみ取得）。クライアントサイドで `useHead()` 等で head を書き換えても SNS カードには反映されない。LP は単一ページのため、ビルド時の index.html 直書きで充分。

### 決定 4: Twitter Card 種別は summary_large_image

LP の主目的は「Hero 画像で世界観を伝える」ことなので、X 上では大きい画像カードを採用する。Player Card や App Card は対象外。

### 決定 5: og:locale = ja_JP / html lang = ja を同時に修正する

OGP の `og:locale` を `ja_JP` に設定するついでに `<html lang="en">` を `lang="ja"` に修正する。両者は LP の言語宣言として整合させる必要があり、ai a11y（スクリーンリーダー）と SEO / SNS クローラーの双方に効く。

## Risks / Trade-offs

- [SNS 側のキャッシュにより旧カードが残る] → X の Card Validator / Facebook Sharing Debugger / LINE は再取得手段が異なる。マージ後に本番 URL を各 Validator に投入し、最新カードへの更新を明示的にトリガーする。検証手順は tasks.md に記載。
- [og:image の絶対 URL ハードコードによる将来独自ドメイン移行の小コスト] → 独自ドメイン移行は別 Issue で扱う前提。`index.html` 内の 3 箇所（og:url / og:image / twitter:image）を書き換えるだけで完了するため許容範囲。
- [SNS シェア専用画像の作成コスト] → Hero のソース画像から 1200×630 にトリミング・書き出しするだけで、追加デザイン作業は最小。
- [PR Preview 上での Validator 検証ができない] → SNS Card Validator は外部からアクセス可能な URL が必要。PR Preview はアクセス制御がない静的サイトのため Validator は通る可能性が高いが、絶対 URL は本番固定のため Preview 上で og:image を Preview ドメイン経由に切り替える運用は採らない。Preview では `<head>` の文字列確認のみ行い、Validator 検証はマージ後の本番 URL に対して実施する（本プロジェクトの「PR Preview は本番 Supabase を見る」運用と同様、シェア検証も本番志向で行う）。
- [メタ情報のテキスト記述ミスによる SEO 影響] → description は 150 文字以内、再構築後 LP の Hero / Concept セクションのコピーと整合させる。tasks.md でレビュー観点として明示する。

## Migration Plan

1. SNS シェア用画像（1200×630）を新規作成し `apps/lp/public/images/` に配置
2. `apps/lp/index.html` の `<html lang>` / `<head>` 配下の OGP・Twitter Card メタを再構成
3. ローカルで `pnpm build:lp` → `apps/lp/dist/index.html` の head 内容を grep で検証
4. PR を作成し、Preview 上で `view-source:` でメタタグの最終形を目視確認
5. マージ後、本番 URL を X Card Validator / Facebook Sharing Debugger に投入してリッチカード描画を確認
6. （必要に応じて）LINE / Slack でも実 URL を貼り付けてカード表示を確認

**ロールバック:** `index.html` の変更を revert すれば即時復帰可能。画像追加のみのため副作用なし。

## Open Questions

- og:title / twitter:title の確定文言（候補: 「High Q｜江東区バレーボールサークル」など、再構築後ブランドに揃えた表現） → Apply 時に確定し、tasks.md のテキストレビュー項目で翔太郎くんに確認する
- og:description / twitter:description の確定文言（150 文字以内、再構築後 Hero / Concept コピーと整合） → 同上、Apply 時に翔太郎くんと確定
- 既存独自ドメインの計画有無（あれば og:url を独自ドメインで書き始められる） → Apply 開始前に翔太郎くんに確認、不明の場合は現行 `high-q-volleyball.onrender.com` を採用
