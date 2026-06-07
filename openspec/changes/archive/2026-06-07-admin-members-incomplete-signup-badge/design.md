## Context

会員登録は 3 ステップ（`/signup` フォーム → `/signup/verify` メール認証 → `/signup/identity` 本人確認書類アップロード）で構成される。ステップ 2 完了時点で `auth.users` と `members` 行が作成され、ステップ 3 はその後 `identity_documents` 行を作成する別フェーズに位置する。reservation 側の auth guard（`apps/reservation/src/app/router.ts:128`）は `hasIdentityDocument === false` の会員を `/signup/identity` に強制誘導するため、本人にとってはサイト機能を使えない待機状態となる。

prd で実際に観測された例: `looove.snoopy@gmail.com` が 2026-05-19 にステップ 2 まで完了したまま、`identity_documents` 行を持たずに残存している。

既存の 48 時間 cleanup ジョブ（`reservation-member-auth` capability）は `email_confirmed_at IS NULL OR profile.signup_completed != true` のみを対象とするため、本ケース（メール認証済 + `signup_completed = true` + `identity_documents` 0 件）は cleanup されない。

admin 側では `member_list_view` を経由して会員一覧を表示しているが、現在の view 定義には本人確認書類の有無を示す列がない。

## Goals / Non-Goals

**Goals:**

- 会員一覧画面で「本人確認書類が一度も提出されていない会員」を視覚バッジで識別できるようにする
- 既存の会員一覧の表示・フィルタ・ソート・ページネーション挙動を維持する
- 該当会員数が増えても 1 クエリで取得できる構造を保つ（N+1 を発生させない）

**Non-Goals:**

- 提出済みかつ pending / rejected 状態の書類を別バッジで表現すること（既存の本人確認書類レビュー画面が扱う領域）
- イベント詳細の参加者一覧へのバッジ追加（参加者一覧に未提出会員が現れる経路が存在しない）
- 本人確認書類レビュー画面への未提出会員リスト追加（同画面は提出済み書類のレビューに特化）
- 該当会員への運営側からの再案内メール送信 / 一括削除アクション（別 Issue 候補）
- 48 時間 cleanup ジョブの対象範囲拡張（本変更は表示までで、自動削除の挙動は変えない）

## Decisions

### 判定条件は「`identity_documents` 行が 0 件」の二値とする

| 案 | 内容 | 評価 |
|---|---|---|
| **A（採用）** | `identity_documents` 行が 0 件のときのみ「書類未提出」バッジ | reservation router の予約資格判定（`hasIdentityDocument`）と意味論が完全一致。シンプル |
| B | 「未提出 / status ≠ approved」をまとめて非承認バッジ | 既存の本人確認書類レビュー画面（pending / approved / rejected を一覧 + 詳細でレビュー可能）と機能重複 |
| C | 「未提出 / 審査待ち / 却下」の 3 状態バッジ | 情報過多。レビュー画面と admin 用途が衝突。view 列追加 + 表示分岐コストが増える |

reservation 側の `hasIdentityDocument` 判定は「`identity_documents` 行が 1 件以上あれば true」（status は問わない）であり、admin バッジの判定もこれと揃えれば「予約資格を物理的に持たない会員」の識別と一致する。

### `member_list_view` に列を追加する（クライアント側 join はしない）

`admin-members-list` capability は「一覧と詳細 sheet の取得を view 経由の単一クエリで完結させる」ことを既に契約している。`identity_documents` をクライアント側で別 SELECT してマージすると N+1 と RLS 漏れリスクが発生するため、view 定義に列を 1 つ追加して 1 クエリで取得する。

追加する列名: `has_identity_document` (boolean) — 当該 member の `identity_documents` 行が 1 件以上あれば `true`、0 件なら `false`。

view 集計サブクエリの実装方針: `EXISTS (SELECT 1 FROM identity_documents WHERE member_id = members.id)` の boolean 副問合せで算出する。`status` は問わない（reservation 側 `hasIdentityDocument` 判定との対称性を保つ）。

### バッジは既存「修正依頼 N」と並列の neutral 寄り tone とする

`admin-members-list` の氏名列には既に「修正依頼 N」バッジ（warning tone）が並んでいる。「書類未提出」は危機度では修正依頼より低い（運営の選択肢は「待つ / 連絡する / 削除する」の任意判断であって緊急対応ではない）ため、warning tone は使わず neutral tone（薄いグレー）の小 chip を採用する。

文言は「書類未提出」（固定）。Tooltip は MVP1 では持たない（一覧の hover 情報過多を避ける）。

## Risks / Trade-offs

- **[`member_list_view` の集計コスト増]** → `identity_documents` には `member_id` の B-tree インデックスが既存（`data-schema` capability）。EXISTS は最初の 1 行で短絡評価されるため、会員 1 件あたり追加コストは index lookup 1 回程度に収まる
- **[reservation router の判定が `status IN ('pending', 'approved')` 起源で将来分岐したら admin バッジの意味がずれる]** → 現状の reservation spec は「`identity_documents` 行が 1 件以上 = hasIdentityDocument = true」と定義しているが、`status = 'rejected'` の旧行のみ持つ場合の挙動は spec 上 false 寄り。本 change は「行が 0 件」基準で固定し、reservation 側の判定式が分岐した場合は別 change で揃える方針とする
- **[`status = 'rejected'` で差し戻された会員が「書類未提出」と表記されない]** → 差し戻し済みは本人確認書類レビュー画面の rejected フィルタで追跡できるため、admin 側の追跡経路は確保されている。会員一覧では「行が 1 件でもあれば提出済み」とみなす

## Migration Plan

- DB: `member_list_view` を `CREATE OR REPLACE VIEW` で再作成（テーブル本体は触らない）。ロールバックは旧定義の再 CREATE OR REPLACE
- admin: 既存の `MemberListRow` 型に列追加、widget でバッジ表示、E2E と component test を更新
- 旧 view に依存していたクライアント側のクエリは追加列の影響を受けない（SELECT * ではなく必要列のみ指定の前提）

## Open Questions

- バッジを将来「再案内メール送信」CTA のトリガにするか（本変更スコープ外、別 Issue で検討）
- 48 時間 cleanup の対象に本ケースを含めるか（本変更スコープ外、別 Issue で検討）
