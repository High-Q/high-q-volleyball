## Context

改正電気通信事業法 §27の12 は、利用者の端末から第三者へ情報を送信させる Web サービスに対し、(a) 公表 / (b) 通知 / (c) 同意取得 / (d) オプトアウト提供 のいずれかを義務付けている。High Q は LP に **GTM (`GTM-WNNF9RP`) を無条件ロード**しており、この時点で任意 cookie が同意なしで発行されうる構造になっている。一方、admin / reservation には GTM はないが、Supabase Auth の必須 cookie・Google Fonts CDN 経由の IP 送信・Render の access log（IP/UA）等があり、これらは通知のみで足りる。

将来 (MVP2) で reservation にも GTM を入れる方針があるため、3 アプリで同意基盤を共通化しておくのが最も安価。各アプリの UI スタックは異なる（LP=Vuetify / admin・reservation=shadcn-vue）ため、UI コンポーネント自体の共通化は非現実的だが、**state schema / storage / event** は packages/shared に押し込むことができる。

ステークホルダー: 翔太郎くん（オーナー兼開発者）。法令違反リスクの解消と、#92 reservation 本人確認書類アップロードの本番 ship を妨げないことが目的。

## Goals / Non-Goals

**Goals:**
- 外部送信ポリシーページを LP に新設し、3 アプリ共通の単一 source of truth とする
- 全アプリ初回アクセス時に Cookie 同意 UI を表示し、`necessary` / `analytics` の 2 区分で同意を取得・保存する
- 同意状態は packages/shared 経由で 3 アプリ一貫管理し、MVP2 で reservation に GTM を追加する際は「タグを consent gate に登録する」だけで動く構造にする
- LP の既存 GTM を consent gate 化し、analytics 同意前は読み込まない
- フッター / SignupProfilePage に外部送信ポリシーリンクを常設

**Non-Goals:**
- GA / GTM 以外の任意タグの導入（広告タグ、ヒートマップ等）
- cookie 以外のトラッキング技術（fingerprinting 等）への対応
- 多言語対応（外部送信ポリシーは日本語のみ）
- 同意状態のクロスドメイン共有（origin ごとに分離が前提）
- プライバシーポリシー `/privacy` ページ本体の実装（別 Issue #193）
- admin / reservation で MVP1 から analytics タグを実装すること（同意 UI の箱だけ作って空で運用）

## Decisions

### 1. ポリシーページの実装場所: LP に集約

3 案検討: (A) LP に集約 / (B) 各アプリで個別実装 / (C) `packages/legal-content` で MD 化。

**採用: A**。理由:
- 法令文書は更新時に 1 箇所で済むのが最大価値（ズレリスクを最小化）
- LP は本番稼働中で URL 安定性が高い
- admin / reservation からは外部リンク扱い（別オリジン）になるが、ポリシーページは純情報表示のため認証コンテキスト不要で問題ない

却下した理由:
- B: 3 重メンテによる内容ズレリスク（法令文書として致命的）
- C: 構造重い割に MVP1 のメリットが薄い。将来必要になれば C へ昇格は可能

### 2. 同意基盤を packages/shared で共通化（UI は各アプリ個別）

state / storage / event API のみ共通化し、UI コンポーネント自体は各アプリの UI スタックで実装する。

**理由:**
- LP は Vuetify、admin/reservation は shadcn-vue + Tailwind preset で見た目とプリミティブが根本的に異なる。共通 UI コンポーネントは抽象化コストが見合わない
- 一方、**localStorage の key・schema・consent カテゴリ定義はズレてはいけない**（同意済ユーザーが他アプリに移動した時に混乱する）ので state 側は必須共通化

**API スケッチ:**
```ts
// packages/shared/src/consent/
type ConsentCategory = "necessary" | "analytics";
type ConsentDecision = { necessary: true; analytics: boolean; decidedAt: string };
function getConsent(): ConsentDecision | null;       // 未決定なら null
function setConsent(decision: Omit<ConsentDecision, "decidedAt">): void;
function onConsentChange(handler: (d: ConsentDecision) => void): () => void;
```

Storage key は `hq.consent.v1`（バージョニングで将来 schema 変更に備える）。

### 3. LP の GTM ロードを consent gate 化

現状 `apps/lp/index.html` の `<head>` に GTM の inline script が直書きされており、ページ読み込みと同時に gtm.js が読まれる。

**変更後:**
- inline script を削除し、`apps/lp/src/` 側で `getConsent()` を見て **同意取得後に動的 script tag を挿入**するロジックへ
- 同意済みで再訪したユーザーは初回 paint 後に GTM が読まれる（数百 ms の遅延発生、許容）
- analytics 拒否ユーザーは GTM ロードしない → GA 計測されない

**トレードオフ:**
- 同意前 / 拒否ユーザーの計測欠損は法令準拠の必要コスト（翔太郎くん合意済）

### 4. 同意 UI の表示形式: バナー（モーダルではない）

画面下部固定のバナーで「すべて受け入れる」「必須のみ」「設定」の 3 ボタンを表示。モーダルは閲覧の妨げになるため不採用。

**理由:**
- Issue 完了条件で「バナー or モーダル」と選択肢が示されている
- バナーの方が UX 阻害が小さく、必須情報の閲覧（ポリシーページ等）は同意前でも可能にできる
- 「設定」押下で詳細パネルを展開し、analytics トグルを操作可能にする

### 5. 同意状態の永続化と再表示

- localStorage に `hq.consent.v1` で保存
- 一度同意（受け入れ / 必須のみ）したら **再表示しない**（Issue 完了条件）
- フッターに「Cookie 設定」リンクを別途置き、ユーザーが後から変更可能にする
- localStorage が無効環境（プライベートブラウジング等）ではセッション中はメモリ保持、リロードで再表示

### 6. admin / reservation での同意 UI

MVP1 では gate 対象タグが無いため、UI を出しても挙動が変わらない。それでも実装する理由:
- 3 アプリで一貫した UX（ユーザー視点で「他のアプリでは聞かれたのに」が起きない）
- MVP2 で reservation に GTM を追加する際、UI / 基盤を作り直す必要がない
- 法令上「公表」だけで足りるとはいえ、同意取得の方が安全側

### 7. SignupIdentityPage / SignupProfilePage への対応差分

- SignupIdentityPage: 既存 `PolicyFooter.vue` で `/external-transmission` リンク済 → 本 change ではリンク先（ポリシーページ実体）を作るだけで完了
- SignupProfilePage: PolicyFooter コンポーネントを抽出して `apps/reservation/src/shared/ui/` に移動 → 両ページから利用する構成に変更

### 8. /external-transmission ページの内容構成

- 改正電気通信事業法に基づく外部送信規律対応の根拠説明
- 外部送信先テーブル（送信先 / 情報 / 目的 / 送信タイミング / オプトアウト手段の 5 列）
  - GTM / Google Analytics（任意・analytics）
  - Google Fonts CDN（必要・通知のみ）
  - Supabase（必要・通知のみ）
  - Render（必要・通知のみ）
  - AWS API Gateway / DynamoDB（LP 既存・必要・通知のみ）
- Cookie 同意状態の確認・変更方法
- 最終更新日 / 問い合わせ先

## Risks / Trade-offs

- [GA 計測欠損]: 同意前 / 拒否ユーザーの行動が GA で見えなくなる → **緩和**: 翔太郎くんと事前合意済。法令準拠のコストとして受容
- [3 アプリ同時ロールアウトの調整コスト]: フッターリンク先が LP に依存するため、LP デプロイ前に admin/reservation から 404 リンクが発生しうる → **緩和**: LP を先行デプロイ。`reservation-identity-document-upload` spec で「リンク先 404 でも単独受入可」と既に明記されている既存方針を踏襲
- [localStorage 無効環境]: 同意状態を永続化できず、毎回バナーが表示される → **緩和**: 仕様として許容（プライベートブラウジングは元々 cookie/storage を意図的に拒否する設計）
- [consent gate 実装漏れで GTM 先行ロード]: index.html から inline script を削除し忘れると同意前にロードされ続ける → **緩和**: E2E で「同意前は googletagmanager.com へのリクエストが発生しない」を検証
- [packages/shared への循環依存]: 既存の shared エンティティに合わせて配置場所を慎重に決める必要 → **緩和**: `packages/shared/src/consent/` 単独モジュールとして既存 export と独立させる
- [将来の MVP2 で GTM を入れる時に基盤が古びる]: 1 年程度なら schema バージョニング (`hq.consent.v1`) で吸収可能 → **緩和**: 大きな変更が必要になったら `v2` に上げる

## Migration Plan

1. packages/shared に consent 基盤を実装（feature 全体の前提）
2. LP に外部送信ポリシーページ + Cookie 同意バナー + GTM consent gate 化を実装し、**先行デプロイ**
3. admin / reservation に Cookie 同意バナー + フッターリンクを実装（reservation はフッター widget を新設、SignupProfilePage に PolicyFooter を追加）
4. 3 アプリ揃ったところで本番マージ

ロールバック: LP の GTM consent gate 化のみが現行挙動を変える。問題発生時は `index.html` の inline script を戻すコミットで即座に旧挙動に戻せる。

## Open Questions

なし（翔太郎くんとの事前確認で解消済）。
