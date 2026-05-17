## Context

admin（`apps/admin`、Render service `high-q-admin`）は High Q サークル運営者専用の管理画面で、会員台帳・本人確認書類・予約承認など機微情報を扱う。実データへのアクセスは Supabase Auth ゲート（`registerAuthGuard`）と RLS で保護されているが、現状の `render.yaml` および `apps/admin/index.html` には検索エンジンクローラに対するインデックス拒否指示が一切ない。

確認した現状:
- `apps/admin/index.html` には `<meta name="robots">` なし
- `apps/admin/public/` ディレクトリ自体が存在せず `robots.txt` なし
- `render.yaml` の `services[name=high-q-admin]` に `headers` セクションなし
- LP / reservation は公開サイトとして検索流入が必要

reservation も会員ログインを要するが、入会導線として検索流入を許容する設計のため対象外。LP は完全に公開サイトのため対象外。

## Goals / Non-Goals

**Goals:**
- 主要検索エンジン（Google / Bing / DuckDuckGo / Baidu / Yandex 等）が admin のいずれの URL もインデックスしないことを宣言的に伝える
- 本番（`high-q-admin.onrender.com` および将来の独自ドメイン）と PR Preview（`*.onrender.com`）の両方で同じ防御が効くこと
- クローラ実装の差異（メタタグだけ見るもの / HTTP ヘッダーだけ見るもの / robots.txt だけ見るもの）に対する多層防御
- `render.yaml` Blueprint mode を真実の源とする既存ガバナンスを維持

**Non-Goals:**
- LP / reservation のインデックス制御変更（公開サイトとして検索流入が必要なため）
- IP 制限・Basic 認証・WAF など admin の到達制限（既存 Supabase Auth ゲートで十分。本 change はインデックス対策のみ）
- 既に Google にインデックスされている URL の削除申請（Search Console 手順、別 Issue で対応）
- admin の URL を秘匿することによる security through obscurity への依存（本 change はあくまで追加の防御層）

## Decisions

### Decision 1: 3 層併用（HTTP ヘッダー + meta タグ + robots.txt）

3 つすべてを採用する。

- **HTTP ヘッダー `X-Robots-Tag: noindex, nofollow`**: 最も強力。Google / Bing 両方が公式サポート。Render Static Site の `headers` ディレクティブで全パスに付与可能。JS をレンダリングしないクローラにも効く。
- **meta タグ `<meta name="robots" content="noindex, nofollow" />`**: index.html 自体のソースに含まれ、HTML を取得した時点で読まれる。CDN キャッシュやプロキシでヘッダーが落ちた場合のフォールバック。
- **robots.txt `Disallow: /`**: クロール自体を抑制するヒント（インデックス除外を保証するものではないが、クローラのアクセス回数自体を減らす副次効果）。

代替案として「meta タグのみ」「robots.txt のみ」も検討したが、クローラ実装の差異と将来の CDN 経由配信などに備えて多層防御を採用。3 層とも宣言的・低コストで運用負荷の差はない。

### Decision 2: Render Static Site の `headers` ディレクティブで `X-Robots-Tag` を配信

`render.yaml` の admin service ブロックに以下を追加:

```yaml
headers:
  - path: /*
    name: X-Robots-Tag
    value: noindex, nofollow
```

Render Static Site は `headers` フィールドをサポートしており、パスパターンと付与するヘッダーを宣言できる。Blueprint mode で `render.yaml` が真実の源である既存ガバナンス（`render-deployment` spec の「Dashboard 個別設定変更禁止」）に完全に整合。

代替案として `_headers` ファイル（Netlify 互換）も検討したが、Render は `render.yaml` の `headers` を一次サポートしており、設定の真実の源を分散させない方針に揃える。

### Decision 3: meta タグは `noindex, nofollow` を採用

`noindex` だけでなく `nofollow` も付ける。

- `noindex`: このページを検索結果に出さない
- `nofollow`: このページ内のリンクを辿らない（admin 内の遷移先パスがクローラに伝播することを防ぐ）

`X-Robots-Tag` / robots.txt も同じ意図に揃え、3 層すべてで `noindex, nofollow` を一貫させる。

### Decision 4: `apps/admin/public/robots.txt` を新規作成

`apps/admin/public/` ディレクトリ自体が現状未作成のため、ディレクトリと `robots.txt` を同時に新規作成する。内容:

```
User-agent: *
Disallow: /
```

Vite は `public/` 配下のファイルを `dist/` 直下にそのままコピーする標準挙動。Render の `staticPublishPath: dist` から配信されるため、`/robots.txt` で到達できる。

### Decision 5: PR Preview にも同じ防御を適用

PR Preview URL（`high-q-admin-pr-XXX.onrender.com`）も実質公開 URL として一定期間到達可能なため、本番と同じヘッダー / meta / robots.txt が効く構成にする。`render.yaml` の `headers` 設定と `apps/admin/dist/` 配下のファイルは Preview ビルドにも同様に適用されるため、追加の分岐は不要。

## Risks / Trade-offs

- **[Risk] 開発者が誤って LP / reservation にも同様の設定をコピーする** → render-deployment spec の admin Requirement に「admin に限定して適用」を明記し、LP / reservation 側 Requirement には「インデックス拒否ヘッダーを付与しない」を否定形で書かない（現状の公開要件を変えないため）。代わりに design.md と proposal.md で対象を admin のみと明記する。レビュー時のチェック観点として残す。
- **[Risk] `X-Robots-Tag` ヘッダーが将来の CDN / リバプロで落ちる** → meta タグと robots.txt の 2 層がフォールバックとして残る。HTTP ヘッダーがメインの防御だが単一依存ではない設計とする。
- **[Trade-off] robots.txt は Disallow であっても「URL を知っていればインデックスされ得る」** → robots.txt 単独では弱い。本 change は `X-Robots-Tag` と meta タグを主防御に据え、robots.txt はクロール頻度抑制目的での補助的な位置付けとする。
- **[Risk] 既にインデックス済みの admin URL は本対応だけでは消えない** → 本 change のスコープ外。別途 Search Console での削除申請手順を Issue 化する。今回はまず流入経路を塞ぐ。
- **[Risk] PR Preview の URL がインデックスされる懸念** → 同じ `render.yaml` から生成される Preview にも `headers` / index.html の meta / public/robots.txt が含まれるため、本番と同等の防御が自動で効く。
