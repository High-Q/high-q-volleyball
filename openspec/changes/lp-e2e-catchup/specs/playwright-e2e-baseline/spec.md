## ADDED Requirements

### Requirement: dynamic 挙動の E2E は `@smoke` タグを付けてはならない

API レスポンスや時刻に依存する dynamic 挙動を検証する E2E test は、`@smoke` タグを付けてはならない（SHALL NOT）。具体的には以下のいずれかに該当する test は `@smoke` 対象外とする:
- ネットワークレスポンス（API 取得結果、`page.route()` で intercept する対象）に依存する assert を含む
- `page.clock` で時刻を固定しないと結果が変わる
- ユーザー操作（クリック・入力・スクロール等）による状態変化を assert する
- フレーク傾向のあるアニメーション・タイミング依存の挙動を含む

これらは master push 時のフル E2E でのみ実行されなければならず（SHALL）、PR push 時には実行されてはならない（SHALL NOT）。理由は次の 2 点:
1. **PR feedback loop の保護**: dynamic 挙動 E2E は安定性が劣り wall time も長い。PR ごとに走らせると CI ハードリミット閾値（PR < 3 分）を超過する危険がある
2. **smoke 意味論の保護**: smoke は「アプリ壊滅検出」が目的であり、データ依存の fail は smoke の信頼性を損なう

#### Scenario: dynamic 挙動 E2E に @smoke が付与されていない
- **WHEN** `e2e/` 配下の test ファイルを読み込み、`page.route()` / `page.clock` / クリック等のユーザー操作 assert を含む test を識別する
- **THEN** 当該 test の test name および describe name に `@smoke` 文字列が含まれていない

#### Scenario: PR push で dynamic 挙動 E2E が実行されない
- **WHEN** PR push トリガで `pnpm test:e2e:smoke` が実行される
- **THEN** dynamic 挙動 E2E（`page.route()` 等を含む test）は filter で除外され実行されない
