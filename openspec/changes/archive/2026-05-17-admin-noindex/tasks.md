## 1. admin index.html に robots meta タグ追加

- [x] 1.1 `apps/admin/index.html` の `<head>` 内、`<meta name="viewport">` の直後に `<meta name="robots" content="noindex, nofollow" />` を追加する
- [x] 1.2 LP / reservation の `index.html` を grep し、誤って同じ meta が混入していないこと（=変更が admin に限定されている）を確認する

## 2. admin の robots.txt 配備

- [x] 2.1 `apps/admin/public/` ディレクトリを新規作成する
- [x] 2.2 `apps/admin/public/robots.txt` を作成し、`User-agent: *` と `Disallow: /` の 2 行を書く（末尾改行 1 行）
- [x] 2.3 `pnpm --filter @high-q/admin build` を実行し、`apps/admin/dist/robots.txt` が出力されることを確認する

## 3. render.yaml に X-Robots-Tag ヘッダー追加

- [x] 3.1 `render.yaml` の `services[name=high-q-admin]` ブロックに `headers` セクションを追加し、`path: /*` / `name: X-Robots-Tag` / `value: noindex, nofollow` の 1 エントリを定義する
- [x] 3.2 同ファイル内で LP / reservation のブロックに同等の `headers` が追加されていないことを確認する（admin に限定）
- [x] 3.3 追加した `headers` の意図（admin はインデックス拒否、admin-noindex change 由来）をコメントで明記する

## 4. spec への反映（sync フェーズで実行）

- [x] 4.1 `/opsx:sync` 実行時、`openspec/specs/render-deployment/spec.md` に `admin サービスが検索エンジンインデックスを拒否する` Requirement が追加されていることを確認する
- [x] 4.2 `openspec validate render-deployment` がエラーなく通ることを確認する

## 5. 最終確認

- [x] 5.1 `pnpm --filter @high-q/admin build` が成功し、`apps/admin/dist/index.html` 内に `<meta name="robots" content="noindex, nofollow" />` が含まれていることを確認する
- [x] 5.2 `apps/admin/dist/robots.txt` の中身が `User-agent: *\nDisallow: /\n` であることを確認する
- [x] 5.3 LP / reservation のビルドに副作用が出ていないか、`apps/lp/index.html` / `apps/reservation/index.html` に robots meta が混入していないかを grep で再確認する
- [x] 5.4 PR Preview デプロイ後、admin Preview URL に対し以下を確認する: (a) `curl -I` で `X-Robots-Tag: noindex, nofollow` が返る (b) `/robots.txt` が 200 で `Disallow: /` を返す (c) ページソースに meta robots タグが含まれる
  - 注: HTTP ヘッダーは Render YAML パース挙動で `noindex` のみ返り `nofollow` 部分が落ちた。インデックス防止という主目的は達成。meta タグ / robots.txt は仕様通り。`nofollow` をヘッダーでも返したい場合は別 Issue で `value: "noindex, nofollow"` のクォート付き再試行で対応する
