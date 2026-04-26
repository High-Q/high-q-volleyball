## Context

`apps/admin` と `apps/reservation` は monorepo-migration（既 archive）でスケルトンとして作成された段階で止まっており、`main.js` / `vite.config.js` / `<script setup>` のままになっている。一方 `packages/shared` は既に `tsconfig.json` を持ち、`src/types/` 配下で Branded Types や Result 型が TS で実装済み。Phase 1（2026-05-08 リリース目標）に向けて admin / reservation の本格実装を開始する直前であり、本番コードを書き始める前に TS strict 基盤を統一して敷くのが本 change の狙い。

LP（`apps/lp`）は Vue ファイル数が多く、また FSD 化の途中で構造変更が続くため、ここで一括 TS 化すると `lp-fsd-structure` 系の change と衝突する。よって LP は別 Issue (#130) として段階移行する判断を proposal で確定済み。

**現状把握**:
- `packages/shared/tsconfig.json`: strict / module: ESNext / moduleResolution: Bundler 構成あり
- `apps/admin`, `apps/reservation`: Vue 3.4 + Vite 5 + Vuetify 3.4 / `package.json` に `typescript` 未導入
- ルート `package.json`: `build`, `lint` の `pnpm -r` ラッパのみ（`typecheck` 不在）

**ステークホルダー**: オーナー兼開発者（個人）。Claude Code がペアプログラマー。

## Goals / Non-Goals

**Goals:**
- `apps/admin` / `apps/reservation` で `<script setup lang="ts">` ・ `*.ts` ファイルが書ける状態にする
- 各パッケージで `pnpm typecheck` が走り、ルートで `pnpm -r typecheck` が成功する
- TS strict（`strict: true`、`noUncheckedIndexedAccess: true` 等）を全アプリ統一基準に据える
- shared パッケージを admin / reservation から型情報込みで import できる
- LP に手を入れない（影響を分離）

**Non-Goals:**
- LP の TS 化（Issue #130）
- CI ワークフロー (.github/workflows) への typecheck 組み込み（別 PR）
- shadcn/ui + Tailwind 導入（admin / reservation の UI ライブラリ移行は別 change）
- 既存ロジックの本格実装（型基盤の整備のみ）
- Vuetify の型サポート完全化（最低限のビルドが通るところまで）

## Decisions

### D1. tsconfig は app 単位で持ち、ルートに base を置かない

**選択**: `apps/admin/tsconfig.json` と `apps/reservation/tsconfig.json` をそれぞれ独立で持つ。`packages/shared/tsconfig.json` も既存のまま独立。ルート共通 `tsconfig.base.json` は本 change では作らない。

**理由**:
- パッケージ数が小さく（3個）、共通化のメリットより `extends` の解決パス管理コストが上回る
- 各 app の `paths` や `types` は将来的に分岐する可能性が高い（admin は shadcn、reservation はカレンダー系で型が異なる）
- monorepo-workspace の独立性を維持する方針と整合

**検討した代替**: ルートに `tsconfig.base.json` を置いて各 app から `extends` → 後続で必要になったタイミングで切り出すほうが YAGNI 的に正しい。

### D2. Vue SFC の型検査は `vue-tsc` を採用

**選択**: 各 app の `typecheck` スクリプトは `vue-tsc --noEmit -p tsconfig.json` とする。

**理由**:
- Vue 3 公式が SFC の `<script setup lang="ts">` の型検査に推奨
- `tsc` 単体は `.vue` を読めない
- `packages/shared` は SFC を持たないため `tsc --noEmit` のみで OK

**検討した代替**: `vue-tsc` は実体が `tsc` のラッパで本体 `tsc` よりやや遅いが、Vue + TS 構成では実質一択。

### D3. 厳格化レベル — strict + noUncheckedIndexedAccess を採用

**選択**: 各 `tsconfig.json` で以下を有効化。

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": false
  }
}
```

**理由**:
- `strict: true` はプロジェクト規約上の前提
- `noUncheckedIndexedAccess` はインデックスアクセスで `undefined` を強制し、配列・Record の安全性が大幅向上（規約「Result 型でビジネス異常系を区別」と整合）
- `exactOptionalPropertyTypes` は Vuetify の型定義との衝突が頻発するため見送り（採用は将来検討）

### D4. Vite config も TS 化、entry point は `main.ts`

**選択**: `vite.config.js` → `vite.config.ts`、`main.js` → `main.ts`、`index.html` の `<script src="/src/main.js">` を `/src/main.ts` に変更。

**理由**:
- entry が JS だと SFC 内 import が型を失うため一貫して TS に
- Vite は `vite.config.ts` をネイティブサポート（ts-node 不要）

### D5. `vue-tsc` のみで型検査、ビルドは Vite に任せる

**選択**: `pnpm build` は従来どおり `vite build`（型検査なし）。型検査は `pnpm typecheck` で別経路。

**理由**:
- ビルドと型検査を分けることで、ビルド時間を CI で並列化できる
- 開発中は IDE が型を見るので、ビルドフックで毎回回すのは過剰
- CI では別 step で `pnpm -r typecheck` を回す（本 change では準備のみ、組込みは別 PR）

### D6. shared への参照は workspace protocol で

**選択**: `apps/admin` / `apps/reservation` の `package.json` に `"@high-q/shared": "workspace:*"` を依存追加。`packages/shared/package.json` の `exports` (`./api`, `./types`) を経由した import を使う。

**理由**:
- `monorepo-workspace` 既存仕様に整合
- 型は `package.json` の `"types": "./src/index.ts"` 経由で自動解決
- この時点ではまだ実コードからは `@high-q/shared` を import しなくてよい（型基盤整備のみ）。**ただし依存宣言だけ済ませておく**ことで、次の change で即座に使える。

## Risks / Trade-offs

- **[Risk] Vuetify 3 の型定義と `noUncheckedIndexedAccess` が衝突して大量エラーが出る** → Mitigation: 衝突したら当該箇所のみ `// @ts-expect-error` で局所化し、Vuetify 移行（shadcn 化）時に解消。最悪 `noUncheckedIndexedAccess: false` にフォールバックして design 更新。
- **[Risk] vue-tsc のバージョン選定ミスで Vue 3.4 と非互換** → Mitigation: `vue-tsc@^2.x` を使う。3.x は Vue 3.5+ 想定なので避ける。pin する。
- **[Risk] index.html の script src 変更が Vite dev で動かない** → Mitigation: ローカルで `pnpm --filter @high-q/admin dev` と `pnpm --filter @high-q/reservation dev` を起動して確認するタスクを apply に含める。
- **[Trade-off] tsconfig 共通化を見送るので 3 ファイルを個別管理することになる** → 現時点は重複が少ないので許容。重複が増えた段階で `tsconfig.base.json` を切り出す（後続 change）。
- **[Trade-off] LP を分離することで `pnpm -r typecheck` には LP は含まれない（LP に typecheck script がないため何もせず通る）** → Issue #130 完了時点で LP も `typecheck` を持ち、自動的に `pnpm -r typecheck` の対象になる設計にする。

## Migration Plan

1. ブランチ `feature/77-typescript-admin-reservation` を切る
2. `packages/shared` に `typecheck` スクリプトを足す（既存 tsconfig そのまま）→ ルート `package.json` に `typecheck` を追加 → ルートで `pnpm -r typecheck` が shared だけ実行されて通ることを確認
3. `apps/admin` を変換（tsconfig 追加 → main.ts 化 → vite.config.ts 化 → App.vue を lang="ts" 化 → index.html 修正 → typecheck script 追加 → `pnpm --filter @high-q/admin typecheck` で通す → dev で起動確認）
4. `apps/reservation` を同様に変換
5. ルートで `pnpm -r typecheck` が全パッケージに対して通ることを確認
6. ルートで `pnpm -r build` が引き続き通ることを確認（admin / reservation のビルドが壊れないか）

**ロールバック戦略**: 本 change は破壊的変更を含まず、PR 単位の revert で完全に元に戻せる。本番ランタイムへの影響は admin / reservation がまだ未公開のためゼロ。

## Open Questions

- なし（必要なら apply 中に AskUserQuestion で確認）
