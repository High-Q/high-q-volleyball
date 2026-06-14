## 1. シードロジック（純関数・TDD）

- [x] 1.1 `widgets/event-form` に複製シード純関数 `seedFromEvent(source: Event, nextName: string): EventFormState` を追加する。会場 / 開始時刻 / 終了時刻 / 参加費を複製元から引き継ぎ、`date` は空文字、`name` は `nextName` とする。時刻分解は既存 `eventToState` の JST ロジックを共有する
- [x] 1.2 `seedFromEvent` の spec を先に書く（TDD）: 引き継ぎ項目が複製元値になる / `date` が空 / `name` が `nextName` になる / 参加費 NULL → 空文字
- [x] 1.3 複製時タイトル解決 `resolveDuplicateName(source: Event, nextVolume: string | undefined): string` を追加する。複製元タイトルが `vol.<数字>` 語尾なら `nextVolume`（取得済みの全体最大+1）を使い、非連番または `nextVolume` が undefined のときは複製元タイトルをそのまま返す
- [x] 1.4 `resolveDuplicateName` の spec を書く（TDD）: 連番 → nextVolume 採用 / 非連番 → そのまま / nextVolume undefined → 複製元タイトルそのまま

## 2. 作成フォームへのシード注入

- [x] 2.1 `EventForm` の create mode が複製シード（`seedEvent?: EventFormState`）を初期 state として受け取れるようにする。`seedEvent` 未指定時は既存の空フォーム既定値（18:00–20:00）を維持する
- [x] 2.2 `useEventForm` の初期 state 解決を、`seedEvent` 指定時はそれを採用するよう拡張する。dirty 判定の基準スナップショットはシード適用後の state とする
- [x] 2.3 `EventForm` create mode で複製中のとき、複製元イベント名を含む「複製して作成中」の手がかりをフォーム上部に表示する。HQ デザイントークン経由で着色する

## 3. 作成ページの `?from` ハンドリング

- [x] 3.1 `EventCreatePage` で `from` クエリを読み取り、指定時は `getEventById`（entities/event 既存）で複製元を取得する。取得中は最小の Loading を表示する
- [x] 3.2 複製元の取得成功時、`suggestNextVolume`（既存）で全体最大+1 を解決し、`resolveDuplicateName` + `seedFromEvent` でシード state を組み立てて `EventForm` に渡す
- [x] 3.3 複製元の取得失敗（該当なし / RLS 不可 / 通信失敗）時は、シードを適用せず通常の空フォームにフォールバックして作成を継続できるようにする
- [x] 3.4 `EventCreatePage` の spec を書く: 取得成功で手がかり表示＋シード適用 / 取得失敗で空フォームにフォールバック / `from` なしは従来どおり

## 4. 一覧操作列の「複製」リンク

- [x] 4.1 `EventsTable` の操作列に「編集」の隣へ「複製」リンクを追加する。遷移先は `/events/new?from=<row.id>`、`relative z-10` でストレッチリンクの上に乗せ、`aria-label`（「<イベント名> を複製して新規作成」）を付与する。色・余白は既存「編集」リンクと同じトークン utility に揃える
- [x] 4.2 `EventsTable` の spec に「複製リンクが存在し `/events/new?from=:id` を指す」「aria-label を持つ」ケースを追加する

## 5. E2E（auth guard）

- [x] 5.1 既存 `events-crud.e2e.ts` の確立済み方針（認証コスト回避のためハッピーパスは component test に押し下げ、E2E は auth guard のみ）に合わせ、複製先 `/events/new?from=<id>` が未認証で `/login` にリダイレクトされる E2E を 1 本追加する。複製のハッピーパス（引き継ぎ / 開催日空 / 複製元不変）は `duplicateSeed.spec` / `EventCreatePage.spec` / `EventsTable.spec` で網羅済み

## 6. 最終確認

- [x] 6.1 `pnpm exec vitest run`（admin スコープ）で全テスト緑を確認する
- [x] 6.2 操作列「複製」リンク周辺を `apps/admin/src/{pages,widgets,features}/**/*.vue` 範囲で `#[0-9a-f]{3,6}\b` および `\[\d+px\]` で grep し、リテラル色 / リテラル spacing のマッチが 0 件であることを確認する
- [x] 6.3 `pnpm build`（admin）が通ることを確認する
- [x] 6.4 ESLint（FSD 境界 / Public API 経由）が複製関連の新規 import で違反しないことを確認する
