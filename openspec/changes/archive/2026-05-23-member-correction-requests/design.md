## Context

実運用で「会員プロフィールの一部だけが不正確」というケースが発生（生年月日が本人確認書類と不一致 / 日本人が氏名をローマ字で登録）。既存の `identity-document-reject` は status=rejected + 既存予約一括キャンセル + admin の `mailto:` リンク手動送信、というアクションが重い設計。データ修正の依頼だけしたい場面に対しては副作用が大きすぎる。

`members.profile` jsonb 列は既に `signup_completed` / `terms_agreed_at` / `name_split_needed` を持つ運用拡張領域として確立済。新規テーブル追加なしで「未対応の修正依頼一覧」を保持できる。

会員サイトには既に `ProfilePage.vue` の `editField` state で各属性の編集モーダルが起動できる構造があり、ログイン後 home は `/events` に固定されているため、バナー設置点も明確。

## Goals / Non-Goals

**Goals:**

- admin が会員詳細から「修正してほしい属性 + 理由」を投稿でき、会員ログイン時の home でバナー通知される
- 会員がバナーから該当属性の編集モーダルを 1 タップで開け、修正できる
- 会員が属性を更新したら対応する修正依頼が自動で消える（admin 二度手間なし）
- 既存予約を保つ（エンゲージメント維持）
- admin が依頼を取り下げできる（誤投稿時の救済）

**Non-Goals:**

- 修正依頼作成時のメール / push / SMS 通知（Phase 2）
- 修正依頼の履歴管理 / 監査ログ（未対応リストのみ）
- 属性値の自動検証（漢字/かな判定 等）— admin の運営判断に委ねる
- 修正依頼を作れる属性の制限ルール（admin に何でも許可）
- 既存予約のキャンセル / status 変更

## Decisions

### 決定 1: `members.profile.correction_requests` jsonb 配列に格納する

新規テーブルや列は追加しない。`profile` jsonb の利用キーとして `correction_requests` を追加運用する。

**Why X over Y:**

- 別テーブル化（`correction_requests` table）: history 管理や検索性が上がるが、MVP1 の「未対応リストだけ持つ」用途には過剰。`profile` jsonb で十分。
- 単一文字列カラム化: 属性別の構造が失われ、自動消化ロジックが書けない
- **採用 jsonb 配列**: 構造化された属性 + メッセージ + メタ情報を持てる。要素削除 / 追加が PostgreSQL の jsonb operator で表現可能

エントリ shape:

```ts
type CorrectionRequest = {
  field: "display_name" | "birthday" | "phone" | "experience_level" | "nickname";
  message: string;       // 1〜500 文字、admin が書く自由文
  requested_at: string;  // ISO 8601
  requested_by: string;  // admin の member UUID（監査用）
};
```

`field` enum はアプリ層で限定する（DB レベル CHECK はしない、jsonb の柔軟性を保つ）。

`display_name` は姓・名 (`last_name` / `first_name`) を一括で扱う統合 field。氏名編集モーダル (`DisplayNameEditDialog`) が両カラムを 1 度に更新するため、admin が個別選択する意味がなく、UI 表記も「お名前」1 つに集約する（2026-05-23 UX レビューでの決定）。

### 決定 2: アプリ全体最前面のモーダル方式（dismiss はセッション内のみ）

- 表示場所: `App.vue` 直下に mount し、認証済ユーザーには **どのページでも** 最前面に出る
- radix-vue の Portal で body 直下に描画されるため、ページ内コンポーネントの重なり順に左右されない
- 配色: `border-danger` + `bg-danger-soft` + ⚠ アイコンで強い警告トーン
- 「閉じる」ボタンで dismiss 可能。dismiss 状態はモジュールスコープの `ref` で singleton 管理
- **ページリロード / 再ログイン (auth-callback navigation) / 異なる member.id への切替 で自然リセット → 再表示**
- 修正完了 / admin 取り下げで `correction_requests` が空になれば dismiss 状態に関わらず自動非表示

**Why this approach (vs バナー / vs 強制ブロック):**

- 単純バナー方式は気づかれないリスクあり（home 上部に出ていても本人が読み流す）
- 強制ブロック（閉じれないモーダル）は当日チェックイン直前にログインしたユーザーをブロックする事故あり
- **採用: 警告色モーダル + dismiss 可（毎セッション再表示）** が「強制力を保ちつつ運用事故を起こさない」中庸として最適

dismiss state を localStorage に永続化しない理由：「翔太郎くんが 1 回 admin から修正依頼を打ったら、会員はログインのたびに気づく」運用を確実にしたいため。

### 決定 3: 会員ログイン時の自動消化ロジック

各属性の `updateMyXxx` mutation を拡張し、対応する `correction_requests` エントリも同時に削除する。

| field | mutation | 削除ルール |
|---|---|---|
| `display_name` | `updateMyName` | `display_name` エントリ削除（姓・名 同時更新で 1 件） |
| `birthday` | `updateMyBirthday` (新規) | `birthday` エントリ削除 |
| `phone` | `updateMyPhone` | `phone` エントリ削除 |
| `experience_level` | `updateMyExperienceLevel` (既存) | `experience_level` エントリ削除 |
| `nickname` | `updateMyNickname` | `nickname` エントリ削除 |
| `email` | `requestMyEmailChange` | （会員 email 確認完了は別経路、確認後トリガで削除する）or 本 change の対象外 |

実装方式:

- mutation 内で SELECT → JS で配列フィルタ → UPDATE で profile 上書き、の 2 ステップ
- jsonb operator (`profile - 'correction_requests'`) で削除する選択肢もあるが、エントリ単位フィルタには JS の方が簡潔
- 同時更新の競合は MVP1 では考慮不要（admin と会員が同一会員を同時編集する確率は極低）

**修正検知ロジック**: 値が変わったかどうかは検知しない。**該当 field の update mutation が成功すれば、内容問わず削除する**。理由: admin が修正を要請した時点で現在値は不適切と判断済、UI 上の編集モーダルが開いた時点で会員は「直そうとしている」状態。同値 update でも「会員が確認した」とみなして消化する。

### 決定 4: 編集モーダル不足を補う

現状 `ProfilePage.vue` の `EditField` enum は `displayName | nickname | email | phone` のみで、`birthday` / `experience_level` は dialog がない。

- **`birthday`**: 新規 `BirthdayEditDialog` を追加（本 change のスコープに含める）
- **`experience_level`**: 既存 `LevelEditSection` は inline（dialog ではない）。バナー連携時は **該当セクションへスクロール + 一時ハイライト** する別動作で対応。新規モーダル化はしない

`EditField` enum を拡張:
```ts
type EditField = "displayName" | "nickname" | "email" | "phone" | "birthday";
```

`experience_level` はバナーの「修正する」ボタンが `scroll-to + highlight` を発火する分岐を持つ。

### 決定 5: バナー→編集モーダル誘導の方式

ProfilePage 既存パターン（`editField` ref）を再利用。バナーが `/profile` に遷移する際、クエリ `?edit=<field>` を付けて遷移し、ProfilePage 側で `onMounted` で `editField` を初期化する。

例: バナーから `router.push('/profile?edit=birthday')` → ProfilePage が `editField.value = 'birthday'` をセット → `BirthdayEditDialog` が `:open=true` で開く。

氏名修正依頼の場合、`field` 値は `display_name`。編集モーダルは `DisplayNameEditDialog`（姓・名 2 入力モーダル）。マッピングは routing 側で `display_name → displayName` (kebab→camel) に変換。

### 決定 6: admin UI の配置

- **会員詳細 sheet**: 既存の `admin_note` 編集セクションの下に「修正依頼」セクションを追加
  - 未対応一覧（field / message / requested_at / 取り下げボタン）
  - 「新規作成」ボタン → モーダル（field select + message textarea + 投稿 CTA）
- **会員一覧（`/members`）**: 名前列の横に小さなバッジ「修正依頼 N」を表示（N=未対応件数）
  - Issue #293 の「書類未提出」バッジと **並列** に表示（同行に 2 種類バッジが出る可能性あり）

会員一覧の SELECT で `profile->'correction_requests'` の長さを取得する必要があるが、既存 `member_list_view` ビューを修正するか、JS 側で `members` テーブルを別 SELECT するか。

**採用**: `member_list_view` に `correction_request_count` 列を追加（JS 側 join より一覧クエリ 1 本にまとめる方が読みやすい）。

### 決定 7: RLS

`members.profile` jsonb は既存ポリシーで：
- 本人 SELECT 可、UPDATE 可（本人の行限定 + role / admin_note 不変など）
- admin 全 SELECT / UPDATE 可

`profile.correction_requests` は jsonb 内部のキーなので、追加 RLS は不要。

**ただし**：本人が `correction_requests` を任意に追加・編集できてしまうのは想定外（会員が自分で「俺の生年月日直して」と入れられる）。実害は admin が会員一覧で見る際に紛れること。MVP1 では `profile` 全体の WITH CHECK は厳格化しない（既存設計通り）が、`docs/06-品質・セキュリティ/03-アクセス制御・認可設計.md` への注記で「`correction_requests` は admin のみ書き込みする運用、本人による書き込みは正規 UI に存在しない」を明示する。

将来的に jsonb の特定キーを RLS で守る場合は別 Issue。

## Risks / Trade-offs

- **会員が自分で `correction_requests` を捏造できる（jsonb 自由書き込み）** → Mitigation: 会員サイト UI には `correction_requests` を編集する画面を出さない。admin 一覧では `requested_by` の admin id が空 or 異常値 = 警告として目視。本格対応は将来 Issue
- **複数 admin が同時に修正依頼を作成すると jsonb 上書き競合の可能性** → Mitigation: admin 数が現状 1 名のため MVP1 では考慮不要。複数 admin 化時に optimistic lock を別 Issue で
- **`/profile` に `?edit=birthday` で遷移したが BirthdayEditDialog の実装に時間がかかる** → 本 change のスコープに新規 dialog を含めるので確実に揃える
- **バナーが home 以外に出ないため、home 経由しない会員（直接 `/reservation/:id` を bookmark）には届かない** → Mitigation: 直接遷移パスでも auth guard を通れば最終的に `/events` に来る機会がある + Phase 2 でメール通知を入れれば補完される
- **未対応件数が一覧に出ることで「修正に応じない会員」がランキング的に見える** → 監視としては機能だが、運営判断で取り下げできるため過剰催促のリスクは低い

## Migration Plan

新規データ構造は jsonb 拡張のみで、既存 members 行への影響なし（`correction_requests` キーは未定義状態 = 空配列扱い）。デプロイ順は通常通り（PR merge → CI → Render auto deploy）。Edge Function 変更なし。

`member_list_view` の修正は migration ファイル 1 本（view drop + recreate with `correction_request_count` 列）。既存 admin 一覧の表示挙動は変わらない（新列を使わなければ無視される）。

**Rollback**: view を旧定義に戻す + アプリコードを revert。`members.profile.correction_requests` データはそのまま残るが無害（参照する UI が無くなるだけ）。

## Open Questions

- 本人 (`members_update_self` RLS) で `profile.correction_requests` の改ざんを禁止すべきか → MVP1 では現状のまま許容、別 Issue で検討
- バナーの dismissal を localStorage で実装するか → 当面なし、要望があれば追加
- email 編集の自動消化対象に含めるか → email は auth 経路の確認完了が成功条件で複雑。本 change の対象外、将来必要なら別途
