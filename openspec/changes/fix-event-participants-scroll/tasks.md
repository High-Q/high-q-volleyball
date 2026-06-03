## 1. 事前調査（同種バグの取りこぼし防止）

- [x] 1.1 `apps/admin/src` 配下で `flex flex-col` をルートに持つ Widget を `grep -rn "<div class=\"flex flex-col"` で列挙し、参加者一覧 Widget 以外に親 flex item で高さを受け取るべきなのに `h-full` を欠いている Widget が無いかを確認。あれば同 PR で同様の修正を加え、tasks.md 末尾に追記してから着手する（事前調査では当 Widget のみが該当）
  - 確認結果: `EventDetailSkeleton.vue` も `flex flex-col` だが固定高さ placeholder で内側スクロール不要のため意図的 OK。`ConsentBanner` / `EventForm` 等は非ルート用途（`gap-hq-*` 系）。当該バグは `EventParticipantsWidget` のみ

## 2. 実装（class 修正）

- [x] 2.1 `apps/admin/src/widgets/event-participants/ui/EventParticipantsWidget.vue` の template ルート div の class を `flex flex-col` から `flex h-full flex-col` に変更
- [x] 2.2 内側の `<div class="flex-1 overflow-auto px-hq-8 pt-hq-3">` は変更しない（既に正しい）
- [x] 2.3 script section / props / emits / composable 呼び出しには触らないことを diff で確認

## 3. ローカル確認（4 状態 + モバイル幅）

- [ ] 3.1 `pnpm dev:admin` を起動し、ローカル admin で参加者多数イベントを開く（dev DB に参加者 0 件しかなければ seed で複数件追加してから確認）
- [ ] 3.2 Success（参加者多数）状態: 内側スクロールバーがテーブル領域に表示され、TopBar / StatCards / RemainBar / Tabs / Toolbar が固定されることを目視確認
- [ ] 3.3 Empty（参加者 0 件）状態: 「まだ予約がありません。」がテーブル領域に収まり、外側へはみ出さないことを確認
- [ ] 3.4 Loading 状態: 初期読み込み中の skeleton 表示がレイアウト崩れを起こさないことを確認
- [ ] 3.5 Error 状態: participants 取得失敗時の Error メッセージ + 再試行ボタンがテーブル領域内に収まることを確認（dev で人工的に再現が難しい場合は省略可、その旨を Apply 完了報告に明記）
- [ ] 3.6 Chrome DevTools のレスポンシブモードで幅 375px に切り替え、内側スクロールが機能することを確認

## 4. 自動検査（CI ローカル先行）

- [x] 4.1 `pnpm exec eslint apps/admin/src/widgets/event-participants` がパス（boundaries 移行 warning は既存・本変更と無関係）
- [x] 4.2 `pnpm --filter @high-q/admin exec vitest run src/widgets/event-participants` がパス（24/24, 既存 `EventParticipantsTable.spec.ts` への影響なし）
- [x] 4.3 `pnpm --filter @high-q/admin build` がパス
- [x] 4.4 `pnpm exec stylelint "apps/admin/src/widgets/event-participants/**/*.{vue,css}"` がパス（警告なし）

## 5. 翔太郎くんへの動作確認案内

- [ ] 5.1 PR を作成し、Render PR Preview の URL（admin はローカルのみのため別 dev URL は無し）と「dev DB に参加者多数イベントが無い場合の seed 手順 or 手動確認の代替」を Test Plan に明記
- [ ] 5.2 翔太郎くんから OK が出るまで ship フェーズには進まない（CLAUDE.md 承認ゲート）
