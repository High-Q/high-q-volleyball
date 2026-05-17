## 1. テスト先行: Hero 表示崩れの回帰テスト

- [x] 1.1 `apps/lp/src/widgets/hero-first/__tests__/HeroFirst.spec.ts` を新規作成し、Hero 内の主要テキスト要素（kicker / heading / lead / CTA / meta）がすべてレンダリングされることを検証する
- [x] 1.2 同 spec で `.hero-first__body` 要素に `max-height` が当たっておらず、Hero セクション全体に対して `overflow: hidden` 起因の高さ制約が掛からないことを検証する（vitest config `css: false` のため SFC ソース解析で代替）
- [x] 1.3 `pnpm exec vitest run apps/lp/src/widgets/hero-first` を実行し、現状コードで spec が **失敗する** ことを確認（Red — 2件 fail）

## 2. HeroFirst.vue の CSS 修正

- [x] 2.1 `apps/lp/src/widgets/hero-first/ui/HeroFirst.vue` の `.hero-first` の `height: 600px` / `height: 640px` を `min-height` に変更
- [x] 2.2 `.hero-first__body` から `max-height: 60%` を撤廃
- [x] 2.3 `.hero-first` の `overflow: hidden` は維持されることを確認（背景画像の `Photo` を `position: absolute; inset: 0` で重ねる構造の必要条件のため）

## 3. 検証 (Green) と回帰確認

- [x] 3.1 `pnpm exec vitest run apps/lp/src/widgets/hero-first` を実行し、1 章で追加した spec がすべてパスすることを確認（Green — 3 件 pass）
- [x] 3.2 `pnpm build:lp` を実行し、LP のビルドが通ることを確認
- [x] 3.3 `pnpm exec vitest run` を実行し、LP 全体のテストに回帰がないことを確認（46 件 pass）

## 4. ローカル目視確認

- [x] 4.1 LP dev server を起動し、Chrome DevTools で mobile (375px) / tablet (720px) / desktop (1280px) の 3 ビューポートで Hero meta テキストが全文表示されることを目視確認 *(翔太郎くん判断で B 案＝目視スキップ・PR 直接マージを選択)*
- [x] 4.2 Hero 内のテキストと背景画像の人物が視覚的に被って読めなくなっていないことを確認 *(同上)*
- [x] 4.3 ハンバーガーメニュー・スムーススクロール CTA など Hero 既存挙動に回帰がないことを確認 *(同上)*

## 5. 完了報告

- [x] 5.1 変更ファイル一覧・実行コマンド・目視確認結果を翔太郎くんに報告し、PR 作成可否の判断を仰ぐ
