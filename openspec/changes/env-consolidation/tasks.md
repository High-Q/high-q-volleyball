# Tasks: env 一元化（envDir 化）

> **承認ゲート**: Proposal + Design + spec (env-management) + 本 Tasks の 4 ファイルが揃って承認されてから Apply に入る。

## 進捗

- 完了: 10 / 12 (残: 6.3 / 6.4 dev 起動確認 = ユーザー手動) タスク

---

## 1. 事前作業（ユーザー手動）

- [x] 1.1 既存の `apps/admin/.env.local` または `apps/reservation/.env.local` の値を控える（VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY）

## 2. ブランチ作成 + 初期コミット

- [x] 2.1 Issue + ブランチ作成（`feature/118-env-consolidation`）
- [x] 2.2 propose 4 ファイルを Apply 初期コミット

## 3. root に env テンプレートを配置

- [x] 3.1 リポジトリ root に `.env.example` を新規作成（VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY のテンプレート、コメント付き）
- [x] 3.2 **【ユーザー手動】** リポジトリ root に `.env.local` を作成し、Step 1.1 で控えた値を貼る

## 4. vite.config.js の envDir 設定

- [x] 4.1 `apps/admin/vite.config.js` に `envDir: path.resolve(__dirname, '../..')` を追加
- [x] 4.2 `apps/reservation/vite.config.js` に同様の設定を追加

## 5. 旧 env ファイルの削除

- [x] 5.1 `apps/admin/.env.example` を git rm
- [x] 5.2 `apps/reservation/.env.example` を git rm
- [x] 5.3 **【ユーザー手動】** `apps/admin/.env.local` と `apps/reservation/.env.local` を手動削除（git 管理外なので user 操作）

## 6. 動作確認・PR

- [x] 6.1 `pnpm install` 成功
- [x] 6.2 `pnpm build:lp` で LP に影響なし確認
- [ ] 6.3 **【ユーザー手動】** `pnpm dev:admin` 起動して `import.meta.env.VITE_SUPABASE_URL` が読めるか確認（admin の vite が起動して Vue が DOM にマウントされれば OK）
- [ ] 6.4 同じく reservation も起動確認
- [x] 6.5 `find apps -maxdepth 2 -name ".env*"` が 0 件
- [ ] 6.6 PR 作成（base: master、Closes #118）
- [ ] 6.7 CI 全パス + Render PR Preview ビルド成功

---

## 備考・ブロッカー

- Step 3.2 と Step 5.3 はユーザー手動（settings.json deny で Claude は `.env.local` を触れない）
- Step 6.3 / 6.4 もユーザー手動（私はブラウザ起動できないため）
- LP は本 change のスコープ外、影響なし
