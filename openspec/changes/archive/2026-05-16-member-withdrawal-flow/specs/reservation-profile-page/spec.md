## ADDED Requirements

### Requirement: 「アカウント削除」セクション

`/profile` 画面は、既存セクション群（LEVEL / ACCOUNT / STATS / ログアウト動線）に続く最下部に「アカウント削除」セクションを MUST 表示する。本セクションは danger tone（赤系トークン）でスタイリングし、「アカウントを削除する」ボタン（danger variant）と短い説明文（「会員データを完全に削除します。元に戻せません」相当）を含む。

セクションはログイン中の会員本人にのみ表示 SHALL し、admin と一般会員の区別なく利用可能とする（admin であっても自分のアカウントの自己退会経路は持つ）。

#### Scenario: セクションの表示
- **WHEN** 認証済みの会員が `/profile` を開く
- **THEN** 最下部に「アカウント削除」セクションと danger ボタンが表示される

#### Scenario: 視覚的な分離
- **WHEN** セクションが描画される
- **THEN** 上部のログアウト動線と明確に視覚分離（divider または十分な余白）され、danger tone のラベルで誤操作リスクを伝える

### Requirement: 削除確認 Dialog

「アカウントを削除する」ボタン押下時は、確認 dialog を MUST 表示する。dialog は以下の要素を含む:

- 警告文: 削除によって失われるデータの内容（過去予約・本人確認書類画像を含む全データが完全に削除される旨、元に戻せない旨）
- 「未来予約 N 件は退会前に自動キャンセルされます」の明示（N > 0 のときのみ）
- 同意チェックボックス（「上記内容を理解し、削除に同意します」相当）
- 「キャンセル」ボタン
- 「削除する」ボタン（danger variant、チェックボックス未チェック時は disabled）

dialog はフォーカストラップ・Esc キー・背景クリックで閉じる動作を MUST 提供する。

#### Scenario: 確認 dialog の構成
- **WHEN** 会員が「アカウントを削除する」ボタンを押下
- **THEN** 上記要素を含む dialog が表示される

#### Scenario: チェックボックスで削除有効化
- **WHEN** 会員が同意チェックボックスを ON にする
- **THEN** 「削除する」ボタンが enabled になる

#### Scenario: 未来予約件数の表示
- **WHEN** 会員が未来予約を 1 件持つ状態で dialog を開く
- **THEN** dialog に「未来予約 1 件は退会前に自動キャンセルされます」が表示される

#### Scenario: 未来予約ゼロ件
- **WHEN** 会員に未来予約がない
- **THEN** 未来予約に関する文言は dialog に表示されない

### Requirement: 削除実行とログアウト・LP リダイレクト

「削除する」ボタン押下時、reservation アプリは MUST `withdraw-member` Edge Function を `target_member_id = auth.uid()` で呼び出す。成功時（200 / 204）には次の挙動を MUST 提供する:

1. `supabase.auth.signOut()` を呼び、ローカルセッションをクリアする
2. LP（公開トップ）にリダイレクトする
3. リダイレクト先で完了メッセージ（Toast または LP の専用フラグメント）を表示する

失敗時（403 / 500 / ネットワークエラー）には次の挙動を MUST 提供する:

- dialog 内に error メッセージを表示
- 「削除する」ボタンを再 enabled にし、再試行可能にする
- セッションは維持したまま `/profile` に留まる

#### Scenario: 削除成功
- **WHEN** 会員が確認 dialog で「削除する」を押し、Function が 200 を返す
- **THEN** クライアントはサインアウトされ、LP トップにリダイレクトされる

#### Scenario: 削除完了メッセージ
- **WHEN** LP リダイレクト直後
- **THEN** 完了メッセージ（Toast または LP 側フラグメント）が表示される

#### Scenario: Function 失敗
- **WHEN** Function が 500 を返す
- **THEN** dialog 内に error メッセージが表示され、ボタンが再 enabled になる。セッションは維持され `/profile` に留まる

#### Scenario: ネットワーク失敗
- **WHEN** Function 呼び出しがタイムアウトする
- **THEN** dialog 内に「ネットワークエラー。再試行してください」が表示され、ボタンが再 enabled になる

### Requirement: モバイル + アクセシビリティ

「アカウント削除」セクションおよび確認 dialog は MUST 次のアクセシビリティ要件を満たす:

- mobile 390px 幅で見切れない
- danger tone のコントラスト比は WCAG AA を満たす
- dialog は `role="alertdialog"` + `aria-modal="true"` + フォーカストラップ
- キーボードのみで「セクションへ移動 → ボタン押下 → dialog 内チェック → 削除実行」まで完結可能

#### Scenario: モバイル幅での描画
- **WHEN** 390px 幅で `/profile` を描画
- **THEN** セクションのテキスト・ボタンが見切れず、ボタン高さは 44px 以上（タップターゲット）

#### Scenario: スクリーンリーダー
- **WHEN** スクリーンリーダーで「アカウントを削除する」ボタンに到達
- **THEN** ボタンが danger なアクションであることがアクセシブル名から伝わる
