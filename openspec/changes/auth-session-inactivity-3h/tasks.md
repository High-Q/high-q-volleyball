## 1. クライアント側 idle timeout 閾値変更

- [x] 1.1 `apps/admin/src/features/auth/composables/useIdleTimeout.ts` の `IDLE_LIMIT_MS` を `15 * 60 * 1000` から `3 * 60 * 60 * 1000` (= 10,800,000 ms) に変更する
- [x] 1.2 同ファイルの JSDoc コメント先頭ブロックの「15 分」「JWT 30 分 + idle timeout 15 分」記述を「3 時間」「JWT 1 時間 + idle timeout 3 時間」に更新する (動作確認用に短縮値を入れる開発手順例も整合的に書き換える)

## 2. テスト更新

- [x] 2.1 `apps/admin/src/features/auth/composables/useIdleTimeout.spec.ts` の時間リテラルを 3 時間ベースに更新する: `900_000` → `10_800_000`、テスト名 `"15 分 (900_000ms) 経過で onIdle が呼ばれる"` → `"3 時間 (10_800_000ms) 経過で onIdle が呼ばれる"`、`800_000` / `200_000` などの中間値も「3 時間直前 / リセット後 3 時間直前」相当のスケールに引き上げる (例: `10_700_000` + リセット + `10_700_000` で `expect(onIdle).not.toHaveBeenCalled()` を維持、続けて `200_000` 追加で 3 時間到達)
- [x] 2.2 `stop()` 後の `vi.advanceTimersByTime(2_000_000)` も `vi.advanceTimersByTime(12_000_000)` 等、3 時間を超える値に引き上げ「stop 後は何時間進んでも onIdle が呼ばれない」契約を維持する
- [x] 2.3 二重 start のテスト時間リテラル (`900_001`) も `10_800_001` 等に更新する

## 3. テスト・ビルド検証

- [x] 3.1 `cd apps/admin && pnpm exec vitest run src/features/auth/composables/useIdleTimeout.spec.ts` を実行し、更新後の 5 テストが全て pass することを確認する
- [x] 3.2 `cd apps/admin && pnpm exec vitest run` で admin 全テストが緑であることを確認する
- [x] 3.3 `pnpm --filter @high-q/admin build` を実行し、型エラー無く成功することを確認する

## 4. PR 作成・ユーザー確認

- [ ] 4.1 ブランチ `fix/297-auth-session-inactivity-3h` (既に切替済) に本 change の変更をコミットする (1 PR = 1 コミット可)
- [ ] 4.2 PR を Issue #297 と紐付けて作成する。本文では「当初の採用方針 A (Supabase `inactivity_timeout`) が Pro プラン限定機能で Free プランでは実装不可だったため、案 B クライアント側 idle 3h に方針転換」した経緯を Test Plan / Summary で明示する
- [ ] 4.3 翔太郎くんの Render PR Preview 確認 OK を待つ (基本動線: admin ログイン → 保護ルート遷移 → ログアウト)

## 5. /opsx:sync / archive / merge

- [ ] 5.1 `/opsx:sync` で `openspec/specs/admin-auth/spec.md` に delta を反映する
- [ ] 5.2 `/opsx:archive` で `openspec/changes/auth-session-inactivity-3h/` を archive 配下に移動する
- [ ] 5.3 sync / archive のコミットを PR にも push してから master へマージし、Render 自動デプロイ後の admin で通常ログイン動線が機能することを実機確認する

## 6. 後始末

- [ ] 6.1 マージ済みブランチを削除する (`git push origin --delete fix/297-auth-session-inactivity-3h`)
- [ ] 6.2 Issue #297 をクローズし、GitHub Project Status を Done に更新する。コメントに「Pro プラン昇格時に Supabase `inactivity_timeout` でサーバ側一本化する別 Issue を改めて起こす」旨を残す
