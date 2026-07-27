## 1. 事前確認（現状の固定）

- [x] 1.1 対象孫依存の現行インストール版を lockfile で再確認する。実測: `brace-expansion` 1.1.14 / 2.1.0 / **5.0.5**、`form-data` 4.0.5、`fast-uri` 3.1.2、`js-yaml` 4.1.1、`tar` 7.5.13、`immutable` 4.3.8、`js-cookie` 3.0.5、`esbuild` 0.21.5 / 0.27.7（想定どおり）
- [x] 1.2 `git status` がクリーンで、変更対象がルート `package.json` と `pnpm-lock.yaml` のみになる見込みであることを確認する

## 2. pnpm.overrides の追記（現行メジャー系統内のパッチ版へ）

ルート `package.json` の `pnpm.overrides` に以下を追記する。**いずれも上限（`<次メジャー`）を明記し、メジャー系統を跨がせない**（`>=` 単体だと fast-uri→4 / js-yaml→5 / immutable→5 へ誤ジャンプするため必須）。

- [x] 2.1 `form-data`: `>=4.0.6 <5`（現行 4.0.5 → **4.0.6**、脆弱 `>=4.0.0 <4.0.6` / high）
- [x] 2.2 `fast-uri`: `>=3.1.4 <4`（現行 3.1.2 → **3.1.4**、脆弱 `>=3.0.0 <=3.1.3` / high。2 アラートを 3.1.4 で一括カバー）
- [x] 2.3 `js-yaml`: `>=4.2.0 <5`（現行 4.1.1 → **4.3.0**、脆弱 `>=4.0.0 <=4.1.1` / medium）
- [x] 2.4 `tar`: `>=7.5.16 <8`（現行 7.5.13 → **7.5.22**、脆弱 `<=7.5.15` / medium）
- [x] 2.5 `immutable`: `>=4.3.9 <5`（現行 4.3.8 → **4.3.9**、脆弱 `<4.3.9` / high。sass 経由・ビルド時 CSS コンパイルのみ）
- [x] 2.6 `js-cookie`: `>=3.0.7 <4`（現行 3.0.5 → **3.0.8**、脆弱 `<=3.0.5` / high。@vue/test-utils 経由・テストのみ）
- [x] 2.7 `brace-expansion`: **5.x のみ**をスコープ（`"brace-expansion@5": ">=5.0.7 <6"`）→ **5.0.8**（現行 5.0.5 が脆弱 `>=3.0.0 <5.0.7` / high）。1.1.14 / 2.1.0 は脆弱範囲外なので不変。名前だけの一括オーバーライドは行わない

## 3. esbuild の扱い（スコープ判断）

- [x] 3.1 `esbuild` 0.21.5（vite 5 の peer 固定・脆弱 `<=0.24.2` / medium・アラート #136）は **本変更ではスコープアウト**。単独で 0.25 へ上げると vite 5 内部を壊すリスクがあり、クリーンな解消は Issue #361（vite 6 → esbuild 0.25）が担う。overrides に含めていない
- [x] 3.2 `esbuild` 0.27.7（tsx 経由・脆弱 `>=0.27.3 <0.28.1` / low・アラート #160）は **esbuild を直接 override せず、`tsx` を `^4.19.0`→`^4.23.1` へ更新**して解消した。tsx 4.23.1 が `esbuild ~0.28.0` を要求するため、作者テスト済みの組で **esbuild 0.28.1** が入り、vite 側 0.21.5 を巻き込むリスクもゼロ（global override より安全）。tsx バイナリ postinstall 完走・design-tokens ビルド緑を確認済み

## 4. 適用と重複整理

- [x] 4.1 `pnpm install` を実行し、overrides が解決されることを確認（onlyBuiltDependencies の esbuild 0.28.1 バイナリ postinstall 正常完走）
- [x] 4.2 `pnpm dedupe` を実行（`Already up to date`）、`pnpm-lock.yaml` 更新
- [x] 4.3 解決版を lockfile で目視確認。`brace-expansion` 1.1.14 / 2.1.0 は**元のまま**で 5.x のみ 5.0.8、fast-uri 3.1.4 / js-yaml 4.3.0 / immutable 4.3.9 は**メジャー内**、esbuild 0.21.5 は不変。メジャー跨ぎの誤爆なし

## 5. 検証（受け入れ条件）

- [x] 5.1 `pnpm build:lp` が緑（980ms）
- [x] 5.2 `pnpm --filter @high-q/admin build` / `pnpm --filter @high-q/reservation build` が緑
- [x] 5.3 テストが緑 — **`pnpm -r test`**（パッケージ個別実行）で admin 1025 / reservation 845 / lp・shared・ui・design-tokens・tailwind-preset・supabase/functions すべて pass、exit 0。※ root で `pnpm exec vitest run` を単一プロセス実行するとアプリ間 `@/` エイリアスが混線して大量 false-fail するため、正規の実行は `pnpm -r test`（本件の範囲外の既知の実行方法問題）
- [x] 5.4 `pnpm -r typecheck` が緑（全 8 プロジェクト Done）
- [x] 5.5 Lint（eslint 0 errors / stylelint Done）が緑 — fast-uri / brace-expansion の Lint 経路も影響なし

## 6. 記録と後始末メモ

- [x] 6.1 PR 本文に「本変更で解消するアラート」（#141 #160 #162 #171 #176 #177 #178 #179 #180 #181 の 10 件）と「#361 へ委譲する残存」（esbuild #136 / vite 各件 / vitest #151-159）を明記する
- [x] 6.2 将来 tsx / 各親パッケージがパッチ版へ追随してオーバーライドが冗長になったら、#361 のメジャー更新時に不要な overrides を掃除する（design のトレードオフに記載済み）
