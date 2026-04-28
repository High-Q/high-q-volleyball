# Claude Code 開発ガイド — High Q バレーボールサークル

---

## ⛔ 最重要原則：承認ゲート

**ユーザーの明確な合意がない限り、次フェーズへ進むことを禁止する。**

承認の判定は「**「承認」という literal なキーワード**」に縛らず、合意に相当する言動を広く受け入れる:

| 承認とみなす | 承認とみなさない |
|---|---|
| 「承認」「OK」「進めて」「やって」「go」など同意の明示 | 沈黙・反応なし |
| **前段成果物（Proposal 等）の提示後**に `/opsx:apply` / `/opsx-ship` 等の次フェーズコマンドを起動 | 「待って」「考える」「保留」など留保 |
| 「Aで」「これで」など複数候補への明確な選択 | 提案内容への質問のみ（"なぜ？" 等） |
| Render プレビュー確認後の「OK 完了」「ship」などの ship 合図 | 前段が未提示・未完成のまま次フェーズコマンドを起動（要確認） |

```
/opsx:propose
  → Proposal + Design + Task を同時生成・提示
  → [合意待ち: 3 ファイルをレビュー後に承認に当たる言動]
  → /opsx:apply で実装開始
  → [合意待ち: ローカル確認結果を提示後に承認に当たる言動]
  → PR 作成
  → ユーザー確認(Render プレビュー)
  → /opsx:sync (specs / docs 更新)     ← マージ前にやる
  → /opsx:archive (change を archive へ移動)
  → sync / archive のコミットを push   ← PR に追加コミットとして反映
  → master へマージ
  → ブランチ削除 + Issue を Done       ← 後始末まで含めて完了
```

- Proposal / Design / Task は**同一セッションで同時生成**する（分割しない）
- 3ファイルが揃った状態でユーザーの合意を取ってから Apply を開始する
- Apply 中はタスクリスト順に 1 件ずつ完遂、順序変更・スキップ禁止（ただし論理的順序が明らかにおかしい場合は前倒し提案可）
- **Sync / Archive はマージ前**、同じ PR に push する（マージ後に別 PR 作らない）
- マージ後は **ブランチ削除 + Issue クローズ** まで含めて 1 サイクル

> 文言の literal 解釈にこだわって過剰に止まることは避ける。逆に、合図が曖昧な場合は短く確認する。

詳細フローは `docs/03-アーキテクチャ/05-開発ワークフロー.md` 参照。

---

## ♻️ /clear 運用ルール（コスト効率）

**コンテキストを小さく保つことがコスト効率と回答精度の両方を上げる。** 以下のタイミングで `/clear` を実行:

- **PR が ship 完了した時**（opsx-ship 後）
- **大きなタスクが終わった時**（次の独立タスクに移る前）
- **同じ問題で 2 回修正失敗した時**（汚染されたコンテキストをリセット）
- **CLAUDE.md / 仕様を大幅変更した時**

`/clear` 前に必要なら `/compact <要約指示>` で履歴を圧縮し、次セッションで参照する。

---

## セッション開始時に必ず読むこと

```
openspec/project.md                                   ← 技術スタック・制約
openspec/specs/                                       ← 実装済み仕様
docs/templates/                                       ← Proposal / Design / Task テンプレート
docs/03-アーキテクチャ/04-開発・コーディング規約.md   ← FSD・Value Object・ESLint 設定
docs/03-アーキテクチャ/05-開発ワークフロー.md         ← 人間×Claude 協働プロセス
```

---

## Pillar 1 — OpenSpec & ワークフロー

### フェーズ（順序厳守）

`Propose → Apply → PR 作成 → ユーザー確認 → Sync → Archive → push → Merge → 後始末`

| コマンド | 役割 |
|---|---|
| `/opsx:propose` | Proposal + Design + Task を同時生成 |
| `/opsx:apply` | 承認済み Task を 1 件ずつ TDD 実装 |
| `/opsx:sync` | 実装内容を openspec/specs / docs に反映（マージ前） |
| `/opsx:archive` | change を archive/ へ移動（Sync 後） |
| `/opsx-ship` | PR レビュー OK 後の出荷フロー（sync/archive/push/merge/後始末を一気に） |

### Issue & ブランチ命名

```bash
gh issue create --title "feat: ..." --label "enhancement"
git checkout -b feature/<issue番号>-<kebab-case-summary>
```

### Issue 新規作成時のルール（親 Epic 配置の提案必須）

Issue を新規作成する前に、**必ず親 Issue (Epic) との関係を翔太郎くんに提案する**:

1. **Epic 一覧を必ず先に確認**する: `gh issue list --label epic --state all`
2. 後続 Issue の **作業ドメイン・前提条件** に応じて Epic を選定する
   - 例: 「admin デプロイ」は admin アプリ実装が前提 → 管理画面開発 Epic 配下
   - 例: 「reservation デプロイ」は reservation アプリ実装が前提 → 予約サイト開発 Epic 配下
   - 例: 横断インフラ整備（CI / モノレポ基盤等）→ プロジェクト基盤構築 Epic 配下
3. **元 Issue の Epic を機械的に踏襲しない**。スコープ縮小で分離した後続 Issue は、作業ドメインが元 Issue と異なる可能性が高いため都度判断する
4. 配置候補が複数 or 不明な場合は候補を提示して翔太郎くんに確認
5. 完全に独立した新規タスクなら「親 Issue なし」と明示

提案フォーマット例:
> 「以下の Issue を作成します。Epic 一覧を確認しました（#75 基盤 / #83 管理画面 / #88 予約サイト）。本 Issue は admin アプリ実装後のデプロイ作業のため、配置: **Epic #83 (管理画面開発) の下**」

承認後、Issue 本文の最終行に `Epic: #<親番号>` を記載する。これにより GitHub 上で Epic から後続 Issue を辿れる状態を保つ。

### マージ後の後始末（必須）

```bash
git checkout master && git pull
git branch -d feature/<issue番号>-<...>
git push origin --delete feature/<issue番号>-<...>   # gh pr merge --delete-branch を使った場合は不要
gh issue close <issue番号> --comment "Done in #<PR番号>"
```

### Apply 中のテスト・ビルド実行ルール

UI 変更タスク連続時は、各タスクごとに `pnpm exec vitest run` / `pnpm build:lp` を実行せず、**全タスク完了後の最終確認タスクで 1 回まとめて実行**。
例外（各タスクで TDD を回す）: ロジック新規追加 / spec 新規作成 / バグ修正再発防止テスト。

### Apply 中のコミット粒度

デフォルトは「1 タスク = 1 コミット」。UI フィードバック対応など小粒な集合は「1 PR = 1 コミット」可。

### コンテキスト維持ルール

以下のタイミングで自発的に `project.md` と `design.md` を読み直し、進捗・制約を宣言:
1. Apply 開始時
2. フェーズ切替時
3. 同一セッションで Apply タスクが 5 件超

---

## Pillar 2 — アーキテクチャ（FSD）

```
app → pages → widgets → features → entities → shared
```

依存方向は上位 → 下位の一方向のみ。各スライスは `index.ts`（Public API）経由で外部 import。Supabase client は `shared/api/` のみ。Branded Types でドメイン識別子を表現、生の `string`/`number` 直使用禁止。エラーは `Result<T>` 型で技術エラーとビジネス異常系を区別。

詳細は `docs/03-アーキテクチャ/04-開発・コーディング規約.md`。テスト戦略は `docs/07-テスト/01-テスト戦略・方針.md`。ロギング方針は `docs/06-品質・セキュリティ/07-ロギング方針.md`。

---

## Pillar 3 — UI 品質

| アプリ | UI ライブラリ |
|---|---|
| `apps/lp` | Vuetify 3 |
| `apps/admin` | shadcn/ui + Tailwind |
| `apps/reservation` | shadcn/ui + Tailwind |

Design フェーズで必ずチェック: 影響レイヤー / ビジネス異常系列挙 + UI フィードバック / Loading・Empty・Error・Success 4 状態 / モバイルファースト / アクセシビリティ AA / デザイントークン使用（マジックナンバー禁止）/ **E2E ハッピーパス試験の対象シナリオ列挙**。

新規 feature の Apply に E2E を含める際、**機能あたり 1〜2 件まで**（happy path + 主要 edge case）を上限とする。詳細バリエーションは component test に押し下げる。E2E が肥大化していると感じたら、追加でなく既存テストの component test 化を検討する。詳細は `docs/07-テスト/01-テスト戦略・方針.md` の「E2E スケーラビリティ運用ルール」を参照。

詳細チェックリストは `docs/05-インターフェース/01-UI設計方針.md`。

---

## Pillar 4 — DB & セキュリティ

**RLS なしのテーブル実装を Apply で行うことを禁止**。テーブル変更時は Design フェーズで「SQL Migration + TypeScript エンティティ型 + RLS ポリシー」をセットで提示。

詳細は `docs/06-品質・セキュリティ/03-アクセス制御・認可設計.md`。

---

## Pillar 5 — Git & デプロイ安全性

- `master` への直接 push 禁止。PR は CI 全パスが必須
- **デプロイ 3 回連続失敗時は同じ修正を繰り返さず、3 軸（環境・ビルド設定・依存関係）で根本原因分析しユーザー報告**
- **不具合修正は応急手当て禁止**。構造全体を見て根本原因を解消し、影響範囲も合わせて修正

修正フロー: ①構造全体を読む → ②根本原因の仮説 → ③影響範囲を grep で確認 → ④連鎖修正は 1 PR にまとめる。

詳細は `docs/03-アーキテクチャ/03-インフラ・CICD構成.md`。

---

## セキュリティルール

- `.env` ファイルは**読まない・編集しない・コミットしない・提案しない**（絶対）
- 環境変数の値を Claude に共有しない。Render / Supabase の管理画面で直接設定
- 秘密情報をコードにハードコードしない
- Supabase `service_role` キーをクライアントサイドで使わない
- マイナンバーカードの**個人番号 (12 桁) をテキスト列として保管するコード禁止**。マスク済み画像（個人番号が完全に隠れている）の Storage 保管は許可。通知カードは受け付けない。詳細 SOP: `docs/06-品質・セキュリティ/08-本人確認書類取扱SOP.md`
- SQL インジェクション・XSS に常に注意
