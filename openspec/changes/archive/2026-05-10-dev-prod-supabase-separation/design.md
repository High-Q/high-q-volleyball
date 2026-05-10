## Context

High Q では現状 Supabase プロジェクトが 1 個のみで、dev も prd も同じプロジェクトを共用している。LP は既に本番運用中だが Supabase を使わないため影響はないものの、admin / reservation の Render Service 追加 (#139 / #140) に進む前に dev / prd を物理分離しておかないと、商用ローンチ後に試験データを入れると本番データを汚す / オールクリーンアップすると以後の開発で試験データが入れられないという二律背反が顕在化する。

`docs/08-移行/01-環境戦略・本番リリース計画.md` で Phase 1 として dev / prd 分離が定義されており、本 change はその Phase 1 の「Supabase prd プロジェクト作成 + spec/docs 整備」部分を実装する。Phase 1 の残り（Render Service 追加）は #139 / #140 に委ねる。

着手順序は **#184 → #139 → #140**。本 change を先行させることで、#139 / #140 で admin / reservation の Render Service を追加するときに `value: 本番値 / previewValue: dev 値` で初回設定が完結し、本番が dev DB に書き込む過渡期を発生させない。

## Goals / Non-Goals

**Goals:**
- Supabase prd プロジェクトを新規作成し、dev / prd 2 プロジェクト体制を確立する
- prd プロジェクトに既存 migration を全件適用し、dev とスキーマ同等の空 DB を構築する
- prd プロジェクトに Storage バケット / RLS / 認証メール SMTP / 5 会場 seed を再現する
- render.yaml の admin / reservation 雛形コメントに dev/prd 切替の `envVars` 構造を反映する
- spec / docs の環境変数キー名表記揺れを新形式 `VITE_SUPABASE_PUBLISHABLE_KEY` に統一する
- 翔太郎くんが prd の URL/Key を所有・管理し Claude には共有しないセキュリティ前提を spec に明記する
- マージ後の運用ルール（新規 migration の dev / prd 同期）を docs / spec に明文化する

**Non-Goals:**
- admin / reservation の Render Service 追加（#139 / #140 で対応）
- Render Service の env var を Render Dashboard で実際に切替（Service が存在しないため。#139 / #140 で対応）
- prd Supabase の Auth Redirect URLs を本番ドメインに最終確定させる（admin / reservation の本番ドメインが決まる #139 / #140 で対応。本 change では暫定値 or 後設定でよい）
- migration の CI 自動 push 化（Phase 3 別 Issue）
- staging プロジェクト追加（個人開発フェーズでは過剰、Pro プラン要）
- ローカル Supabase（Docker）の整備（必要時に別 Issue）
- dev → prd のデータコピー（スキーマ移植のみ、データは空）

## Decisions

### Decision 1: prd プロジェクト名は `high-q-prod`、既存 1 個目は `high-q-dev` に改名

**選択**: 既存の曖昧な位置づけのプロジェクトを `high-q-dev` に改名し、新規プロジェクトを `high-q-prod` として作成する。

**Why**: 命名で役割が一目瞭然になり、Supabase Dashboard 上で誤操作リスクが下がる。Issue #184 本文での命名と一致させる。

**Alternatives**:
- 既存を `high-q` のまま prd 化、新規を dev とする → 既存 dev データを破棄することになり、開発検証を最初からやり直しになる。却下。
- 両方リネームしない → どちらが prd か Dashboard 上で判別できず誤操作リスク。却下。

### Decision 2: migration は `supabase db push` で空 prd に流す（dev データのコピーは行わない）

**選択**: `supabase link --project-ref <prd-ref>` → `supabase db push` で `supabase/migrations/*.sql` を空 prd に全件適用する。dev のデータコピーは行わず、prd は空 DB から立ち上げる。

**Why**: prd は実データのみを蓄積する場所。試験データ混入を物理的に防ぐ最もシンプルな手段。docs/08-移行/01 の方針通り。

**Alternatives**:
- `pg_dump` で dev からスキーマ + データをコピー → 試験データ混入リスク。却下。
- Supabase Dashboard で SQL Editor から手動投入 → migration ファイルとの一致が保証されず再現性が下がる。却下。

### Decision 3: Render env var の dev/prd 切替は `envVars[].value` + `envVars[].previewValue` の 2 段構造

**選択**: `render.yaml` の admin / reservation 雛形コメントに以下の構造を反映する。

```yaml
envVars:
  - key: VITE_SUPABASE_URL
    sync: false              # Dashboard で本番値 (prd) を設定
    previewValue: <dev-url>  # PR Preview ではこの値（dev）を使う
  - key: VITE_SUPABASE_PUBLISHABLE_KEY
    sync: false              # Dashboard で本番値 (prd) を設定
    previewValue: <dev-key>
```

**Why**: 公式の Preview Environments 機能で「本番デプロイは prd、PR Preview は dev」が透過的に切り替わる。アプリコード側で環境判別ロジックが不要。

**Alternatives**:
- 全環境で `sync: false` にして Render Dashboard で個別設定 → Preview ごとに手動設定が必要、運用負荷高。却下。
- Render の Environment Group 機能で切替 → Static Site では使いにくく、本リポジトリの Blueprint mode と相性が悪い。却下。

**Note**: Supabase Publishable Key は **公開キー**（RLS で保護）なので `previewValue` に書いて git にコミットしても問題なし。一方 `secret` キー（旧 service_role 相当）は絶対に書かない（RLS バイパス）。

### Decision 4: prd の URL / Publishable Key の値は本 change のコード / Issue / コメントに**書かない**

**選択**: prd プロジェクト作成後、URL / Publishable Key の実値は翔太郎くんが Supabase Dashboard で取得し、Render Dashboard で直接設定する。Claude には共有しない。`previewValue` には dev の値が入るが、これは公開キーで RLS 保護されるため許容。

**Why**: CLAUDE.md セキュリティルール「環境変数の値を Claude に共有しない」「秘密情報をコードにハードコードしない」に準拠。dev の Publishable Key は既に翔太郎くんの手元にある既知の値で、新規流出ではない。

**Alternatives**: なし（セキュリティ要件として固定）。

### Decision 5: 表記揺れ `VITE_SUPABASE_ANON_KEY` → `VITE_SUPABASE_PUBLISHABLE_KEY` を本 change で全統一

**選択**: `docs/03-アーキテクチャ/03-インフラ・CICD構成.md` および `docs/08-移行/01-環境戦略・本番リリース計画.md` で残っている旧表記 `VITE_SUPABASE_ANON_KEY` を新形式 `VITE_SUPABASE_PUBLISHABLE_KEY` に統一する。

**Why**: spec 側（env-management / supabase-foundation）は既に新形式に更新済で、docs 側だけが古い。dev/prd 分離 spec を新規記述する前にここを揃えないと、新たな表記揺れが固定化される。

**Alternatives**:
- 別 Issue で表記揺れだけ修正 → 本 change で env-management spec を触る以上、同 PR で統一する方が整合性が取れる。却下。

### Decision 6: マージ後の運用ルール「新規 migration は dev / prd 両方に同セッションで push」

**選択**: 本 change マージ以降、新規 migration を作る Apply で dev に `supabase db push` した直後、prd にも `supabase link --project-ref <prd-ref>` → `supabase db push` する運用を spec / docs に明記する。

**Why**: dev だけ流して prd を流し忘れるとスキーマドリフトが発生し、本番リリース時に本番が落ちる最大の事故源になる。CI 自動化（Phase 3 別 Issue）まではこの手順をルール化する。

**Alternatives**:
- 本番リリース時に migration 全件を一括 push → リリース直前の検証時間がない時に migration エラーが出ると致命的。継続同期に決定。
- CI 自動化を本 change に含める → スコープが広がる。Phase 3 の別 Issue に切り出す。

### Decision 7: prd の認証メール SMTP は Phase 1 では Gmail SMTP を再利用、Resend 移行は Phase 3 別 Issue

**選択**: prd プロジェクトの Auth → SMTP は `docs/06-品質・セキュリティ/10-メール送信設定SOP.md` §Phase 1 の Gmail SMTP 設定を再適用する。Phase 3 で Resend + 独自ドメインに移行する別 Issue は本 change のスコープ外。

**Why**: 商用ローンチを止めない最小構成。docs/08-移行/01 §3.1 の方針通り。

### Decision 8: 作業分担はハイブリッド（Dashboard 操作 = 翔太郎くん / CLI 操作 = レム）

**選択**: 以下の境界線で分担する。

| 担当 | 範囲 | 根拠 |
|---|---|---|
| **翔太郎くん（Dashboard）** | プロジェクトの rename / 新規作成 / SMTP credential 入力 / Redirect URLs 設定 | これらは Supabase Personal Access Token (`sbp_xxx`) 経由の Management API でも自動化可能だが、**当該トークンは全プロジェクトの最高権限**。Claude に渡すと CLAUDE.md セキュリティルール「環境変数の値を Claude に共有しない」に抵触。Dashboard で 5〜10 分の手作業の方が安全 |
| **レム（CLI）** | `supabase link --project-ref <prd-ref>` / `supabase db push` / docs / spec / render.yaml 編集 / 表記揺れ grep & 一括置換 | memory `feedback_dev_db_push_self_execute.md` の「初回 login + link 完了後の `db push` 等はレムが直接実行」方針を prd にも適用 |
| **翔太郎くん（最終検証）** | prd マジックリンクの自分宛メール受信確認 / dev・prd 隔離確認 | 受信は本人のメールアカウントが必須 |

**Why**: 既存 migration `20260428143738_db_schema_foundation.sql` に Storage バケット (`identity-documents`) と 5 会場 seed が `ON CONFLICT DO NOTHING` で冪等に含まれているため、`supabase db push` 一発でスキーマ / RLS / Storage / seed が prd に再現される。Storage と seed の追加 SQL 実行は不要で、レム側の作業はほぼ「`db push` + ドキュメント編集」のみに収束する。

**レムが触れない値の境界線**:
- 共有 OK（レムが知っても問題ない）: prd プロジェクト URL（`https://xxxxx.supabase.co`）、prd Publishable Key（公開キー、RLS 保護下）
- 共有 NG（レムは知らない・受け取らない）: Secret Key（`sbs_xxx`）、DB password、Personal Access Token（`sbp_xxx`）、Gmail App Password

**Alternatives**:
- すべてレム実行（Personal Access Token を共有）→ 全プロジェクト権限を渡すリスク。却下
- すべて翔太郎くん実行 → `supabase db push` の手作業化はミスを生みやすい。memory 方針にも反する。却下

## Risks / Trade-offs

| リスク | 影響 | 対策 |
|---|---|---|
| prd 作成後、#139 / #140 完了までの期間に新規 migration を追加し、dev だけに push して prd に流し忘れる | 本番リリース時にスキーマドリフトで本番が落ちる | Decision 6 の運用ルールを spec / docs に明文化。本 change マージ後の Apply で migration を扱う際は必ず両環境 push を tasks.md に明記する文化を作る |
| `previewValue` に dev Publishable Key を git コミット | 公開キーは RLS 保護のため漏洩リスクなし。ただし `secret` キーを誤って書く事故が発生する可能性 | 本 change では `secret` キーを `render.yaml` に書かないことを spec で明記。PR レビュー時に `secret` 文字列の grep を必ず行う |
| 翔太郎くんが prd の URL/Key を Render に設定し忘れたまま #139 / #140 をマージ | Render が `sync: false` の値を持たず本番デプロイが env なしで起動 → アプリ側で `import.meta.env.VITE_SUPABASE_URL` が undefined → 本番画面が機能不全 | tasks.md の最終検証ステップで「翔太郎くんが prd URL/Key を Render Dashboard で確認・所有していること」を明記。#139 / #140 着手前のチェックリスト化 |
| Auth Redirect URLs が本番ドメイン未確定の状態で prd に設定される | 商用ローンチ時にマジックリンクのリダイレクトで 404 / mismatch エラー | 本 change では Auth Redirect URLs は暫定（`https://localhost` 等）または未設定。#139 / #140 で本番ドメインが確定した時点で再設定する旨を tasks.md と Non-Goals に明記 |
| 5 会場 seed データを SQL Editor で手動投入 → dev と差分が出る | 検証時の挙動差異で本番動作確認の信頼性が下がる | seed は migration ファイル（or 専用 seed SQL）として管理されている分を dev と全く同じ手順で適用する。手動 INSERT は禁止し SQL ファイル経由のみ許可することを tasks.md で固定 |
| dev Supabase の URL/Key が `previewValue` で git にコミットされたあと、後日 dev プロジェクトが何らかの理由でローテーションされる | git 履歴に旧キーが残るが、ローテーションで無効化されているので実害なし。ただし`render.yaml` を更新し忘れると Preview が壊れる | dev プロジェクトのキーをローテーションする運用は当面想定しない。発生時は別 Issue で対応 |

## Migration Plan

本 change のマージ手順（Decision 8 のハイブリッド分担に従う）:

1. **proposal / design / specs / tasks** の 4 ファイルが揃った時点で翔太郎くんレビュー → 承認
2. `/opsx:apply` で実装開始
3. **翔太郎くん（Dashboard 作業、〜10 分）**:
   - 既存プロジェクトを `high-q-dev` にリネーム
   - 新規プロジェクト `high-q-prod` を ap-northeast-1 で作成（DB password は 1Password で管理）
   - prd プロジェクトの **URL** と **Publishable Key**（公開キー）をレムに共有
   - prd の Auth → SMTP に Gmail SMTP credential を入力
   - prd の Auth → Redirect URLs に暫定値（`http://localhost:5173/*` など）を登録
4. **レム（CLI / 編集作業）**:
   - `supabase link --project-ref <prd-ref>` → `supabase db push` で全 migration を prd に適用（既存 migration に Storage バケットと 5 会場 seed が含まれているので一発で構築完了）
   - 適用結果の SELECT 確認 SQL をレムが実行 or 翔太郎くんに依頼
   - `supabase link` を dev に戻す（誤操作防止）
   - docs / spec / render.yaml 雛形コメントを編集
   - 表記揺れ `VITE_SUPABASE_ANON_KEY` → `VITE_SUPABASE_PUBLISHABLE_KEY` を grep & 一括置換
5. **翔太郎くん（最終検証）**:
   - prd マジックリンクを自分のメールアドレスに送信し、受信を確認
   - dev に試験データを投入して prd に影響がないことを確認
6. **PR 作成・レビュー**:
   - 変更ファイルは docs / spec / render.yaml のみ（アプリコード変更なし、`apps/lp` 含まないため Render Preview 生成なし）
   - Render Dashboard 側の env var 切替は本 change では行わない（admin / reservation Service 未追加のため）。#139 / #140 で実施
7. **マージ後**: 新規 migration を作る Apply で **dev push と同セッションで prd push 必須** という運用ルールが発効

**ロールバック**:
- prd プロジェクトを Pause / Delete（追加コスト 0、データなし）
- docs / spec / render.yaml の編集は git revert で戻す
- dev プロジェクトには本 change で何の変更も加えていないので影響ゼロ

## Open Questions

- prd プロジェクト名を `high-q-prod` 固定でよいか、それとも `high-q-production` 等の別命名にするか → 本 change では `high-q-prod` 採用、変更したい場合は Apply 開始時に翔太郎くん確認
- Auth Redirect URLs の暫定値を何にするか（`http://localhost:*` で十分か、ダミードメイン入れるか） → tasks.md で「暫定 `http://localhost` 群、本番ドメインは #139 / #140 で再設定」と記載
- `supabase/migrations/` に Storage バケット作成 SQL が含まれているか未確認 → Apply 時に翔太郎くんが Dashboard 確認、足りなければ手動作成
