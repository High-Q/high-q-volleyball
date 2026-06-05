## Context

イベント詳細画面は flex column の入れ子で構築されている:

- `EventDetailPage` の `<main>` が `h-screen` を持ち、その配下の `.flex-1 overflow-hidden` がスクロール責務を内側に閉じ込める
- `EventDetailWidget` が `h-full` で 100% 高さを受け取り、TopBar / StatCards / Tabs を固定、最後の Tabpanel に `flex-1 overflow-hidden flex flex-col` で残り高さを渡す
- その Tabpanel 内に `EventParticipantsWidget` が入り、Toolbar（固定）と参加者テーブル（可変・スクロール）の 2 段構成にする想定

この構造は他の admin Widget（events-list / members-list / identity-documents-list / identity-document-detail）でも採用されており、いずれもルート要素が `flex h-full flex-col` を持つ。参加者一覧 Widget だけが `flex flex-col`（h-full なし）になっており、親から受け取った高さが内側に伝播しない。結果、内側の `flex-1 overflow-auto` が依拠する高さが決まらず、テーブルが viewport を超えてもスクロールが発火しない。

## Goals / Non-Goals

**Goals:**
- 参加者一覧のみが内側スクロールする挙動を回復する
- 同等の flex 入れ子構造を採用する他 admin Widget と一貫した実装パターンに揃え、今後のレビューで違反が grep 検出可能になる状態にする
- 仕様（`admin-event-detail`）にレイアウト要件を明文化し、回帰時のレビューで検知できるようにする

**Non-Goals:**
- Toolbar 自体を固定（sticky）化する等の体験変更は本 Issue のスコープ外
- 参加者テーブルの仮想スクロール導入（パフォーマンス改善）は本 Issue では扱わない
- 他 Widget のスタイル統一リファクタは本 Issue のスコープ外（grep で同一バグが見つかった場合のみ同 PR で修正）

## Decisions

### D1. ルート要素に高さ伝播 class を付与する（vs. 内側に明示高さを与える）

**選定**: 参加者一覧 Widget のルート div を `flex h-full flex-col` に変更する。`flex-1 min-h-0 flex-col` は採用しない。

**理由**:
- 他 admin Widget と完全同形にすることでレビュー・grep の一貫性が出る（events-list / members-list / identity-documents-list / identity-document-detail はすべて `flex h-full flex-col`）
- 親 `EventDetailWidget` 側の Tabpanel は `flex-1 overflow-hidden flex flex-col` で flex item として高さを配るので、子が `h-full` を取れば 100% 引き継げる
- `flex-1 min-h-0` は flex item として動くが、Tabpanel がさらに別の flex item を増やす将来変更で挙動が変わる可能性がある（保守性が劣る）

**代替案**:
- 内側の `flex-1 overflow-auto` を `h-[calc(100vh-XXXpx)]` 等で絶対高さ指定 → マジックナンバー禁止 + レスポンシブ破綻のため却下
- ルートを除去して内側 div を直接 root に → Toolbar と Table の分離 (4 状態出し分け) が崩れるため却下

### D2. 仕様への追記は ADDED Requirement とする（MODIFIED ではない）

**選定**: `admin-event-detail` spec に「参加者一覧の内側スクロール」要件を ADDED として追加する。

**理由**:
- 既存 spec に scroll / overflow に触れる requirement は存在しない（grep 確認済み）。MODIFIED で既存 requirement を改修するのではなく、新規 requirement として追加するのが意味的に正しい
- MODIFIED は既存 header 完全一致が必須で、誤って既存 requirement に scroll 文言を混ぜると意味が散る

### D3. テスト戦略は admin E2E ハッピーパスで担保し、Vitest jsdom には追加しない

**選定**: 既存の admin E2E（イベント詳細を開いて参加者を表示するシナリオ）が緑のままであることを確認するのみとする。Vitest によるレイアウト挙動のユニットテストは追加しない。

**理由**:
- Vitest + jsdom では `getBoundingClientRect` / `scrollHeight` 等が常に 0 を返すため、内側スクロールが実際に発火するかを検証できない
- 実ブラウザでのスクロール挙動は Playwright で `mouse.wheel` + `scrollTop` 検証することは可能だが、本 Issue は class 1 行修正であり E2E 専用テスト追加はコスパが悪い
- CLAUDE.md「新規 feature Apply の E2E は機能あたり 1〜2 件まで」運用方針に従い、既存 happy path で 4 状態のレンダリング崩れがないことを確認する範囲で十分

## Risks / Trade-offs

- **[Risk]** `h-full` を root に付与した結果、Toolbar 領域や Empty 文言の縦中央配置等が意図せず変わる可能性 → 修正後にローカルで「参加者多数 / 0 件 / loading skeleton / error」の 4 状態を翔太郎くん自身が目視確認する手順を Apply 完了時に提示する
- **[Risk]** 将来 `EventDetailWidget` 側の Tabpanel 構造を変更する際、ルート flex chain が切れて同じバグが再発する可能性 → spec に ADDED Requirement として明文化し、レビューで検知可能にする
- **[Trade-off]** E2E 専用テストを追加しないため、回帰検知は spec 文書 + コードレビューに依存する。本 Issue は class 1 行のため許容範囲。同種バグが再発した場合は E2E 追加を別 Issue で検討する

## Migration Plan

- 後方互換性影響なし。Pure な CSS（Tailwind utility）変更で DB / API 変更を伴わない
- デプロイ後の rollback は git revert で即時可能
- 本番反映前に Render PR Preview でモバイル幅含めて翔太郎くんが目視確認

## Open Questions

なし。
