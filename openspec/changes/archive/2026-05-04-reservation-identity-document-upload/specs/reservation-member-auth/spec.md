## MODIFIED Requirements

### Requirement: 会員登録フロー = `/login` 段階 1 + `/signup/profile` 段階 2

会員登録フローは **3 段階** で構成する SHALL:
- 段階 1: `/login` でメール送信（上記 Requirement と兼用 — 既存会員ログインと共通フォーム）
- 段階 2（`/signup/profile`）: マジックリンク認証完了後、氏名 / 生年月日 / 電話 / 経験レベル / 利用規約同意を入力 → `members` UPDATE
- 段階 3（`/signup/identity`）: プロフィール完成後、本人確認書類 1 点をアップロード（詳細は `reservation-identity-document-upload` capability を参照）

`/signup` 単独ルートは **撤廃** する SHALL（段階 1 は `/login` で兼用するため）。HomePlaceholder 等の「会員登録」CTA は `/login` を指す。

電話番号は事件・トラブル発生時の連絡先を確保する目的で **必須** とする。SMS による実在確認は MVP1 では実施しない（Phase 2 で再評価。詳細は design.md D12 参照）。

#### Scenario: /signup ルートは存在しない
- **WHEN** `apps/reservation/src/app/router.ts` の `routes` 配列を確認する
- **THEN** `path: '/signup'` のルート定義は存在しない（撤廃済み）

#### Scenario: /signup/identity ルートが存在する
- **WHEN** `apps/reservation/src/app/router.ts` の `routes` 配列を確認する
- **THEN** `path: '/signup/identity'` / `name: 'signup-identity'` のルートが定義されている (Step 3 / 3 として)

### Requirement: 会員登録フロー段階 2（プロフィール入力）

`apps/reservation` の `/signup/profile` ページは、認証済み + `isProfileComplete === false` の会員のみアクセス可能 SHALL。氏名 / 生年月日 / 電話（必須・国内携帯番号） / 経験レベル / 利用規約同意の入力を受け付け、同意 ON で CTA「登録する」が活性化する。CTA 押下で `members` テーブルを UPDATE し、`profile.signup_completed = true` + `profile.terms_agreed_at` を既存 jsonb にマージする MUST。成功で `useAuthSession.refresh()` を呼び `/signup/identity` (Step 3 / 3) に遷移する SHALL。

#### Scenario: 全フィールド入力 + 同意 ON で登録
- **WHEN** 認証済み + プロフィール未完成のユーザーが `/signup/profile` で氏名「田中 美咲」/ 生年月日 `1995-03-15` / 電話 `090-1234-5678` / 経験レベル「初めて」/ 同意 ON で CTA を押す
- **THEN** `members` UPDATE が `{ display_name: '田中 美咲', birthday: '1995-03-15', phone: '090-1234-5678', experience_level: 'beginner', profile: { ...existing, signup_completed: true, terms_agreed_at: '<ISO8601>' } }` で実行され、成功後 `/signup/identity` に遷移する

#### Scenario: 利用規約同意なしで登録を試みる
- **WHEN** 全フィールドを入力したが同意チェックボックスが OFF の状態で CTA を押そうとする
- **THEN** CTA は disabled のまま押下できない

#### Scenario: 必須フィールド未入力（氏名）
- **WHEN** 氏名が空で生年月日 / 電話 / 経験レベル / 同意 ON でも CTA を押す
- **THEN** API は呼ばれず、氏名フィールドに「お名前を入力してください」のエラーが表示される

#### Scenario: 生年月日が未来日
- **WHEN** 生年月日に明日の日付を入力して CTA を押す
- **THEN** API は呼ばれず、生年月日フィールドに「生年月日は過去の日付を入力してください」のエラーが表示される

#### Scenario: 生年月日が 100 年以上前
- **WHEN** 生年月日に 1900 年の日付を入力して CTA を押す
- **THEN** API は呼ばれず、生年月日フィールドに「生年月日が正しくありません」のエラーが表示される

#### Scenario: 経験レベル enum 外の値
- **WHEN** Smart constructor `createExperienceLevel('unknown')` が呼ばれる
- **THEN** 例外が投げられる（`'beginner' | 'intermediate' | 'experienced'` 以外を弾く）

#### Scenario: 電話番号未入力
- **WHEN** 電話番号を空のまま、他の必須フィールドと同意 ON で CTA を押す
- **THEN** API は呼ばれず、電話番号フィールドに「電話番号を入力してください（当日連絡用）」のエラーが表示される

#### Scenario: 電話番号が固定電話（携帯ではない）
- **WHEN** 電話番号に `03-1234-5678` を入力して CTA を押す
- **THEN** API は呼ばれず、電話番号フィールドに「携帯電話番号（070 / 080 / 090 で始まる番号）を入力してください」のエラーが表示される

#### Scenario: 電話番号フォーマット異常（桁数不足）
- **WHEN** 電話番号に `090-1234` のような桁数不足を入力して CTA を押す
- **THEN** API は呼ばれず、電話番号フィールドに「電話番号の桁数が正しくありません」のエラーが表示される

#### Scenario: 電話番号の入力ゆらぎを正規化
- **WHEN** 電話番号に `090 1234 5678` (半角空白) または `09012345678` (区切りなし) を入力して CTA を押す
- **THEN** Smart constructor `createPhone()` で正規化された値（`'090-1234-5678'`）が `phone` 列に保存される

### Requirement: 会員プロフィールの取得とキャッシュ

`useAuthSession` は session 確立後、`members` テーブルから自分の行を 1 回 SELECT し、`member` reactive state にキャッシュ SHALL する。同時に `identity_documents` テーブルへの存在チェック (`select id from identity_documents where member_id = ? limit 1`) を並行で MUST 実行し、結果を `hasIdentityDocument` reactive state にキャッシュする。`onAuthStateChange` でセッションが変わるたび、または `refresh()` 明示呼び出しで両方再取得 MUST する。RLS により自分の行のみ返ることを前提とする。

#### Scenario: 初回 session 確立で member 取得
- **WHEN** session 確立後、`useAuthSession.ready()` が解決
- **THEN** `supabase.from('members').select('*').eq('id', auth.uid()).single()` が呼ばれ、`member` state に格納される

#### Scenario: 初回 session 確立で identity_documents 存在チェック
- **WHEN** session 確立後、`useAuthSession.ready()` が解決
- **THEN** `supabase.from('identity_documents').select('id').eq('member_id', auth.uid()).limit(1)` 相当のクエリが並行で呼ばれ、結果が `hasIdentityDocument` state に格納される

#### Scenario: refresh() 呼び出しで再取得
- **WHEN** `/signup/profile` または `/signup/identity` で UPDATE 完了後に `refresh()` を呼ぶ
- **THEN** members と identity_documents の両方から最新値が再取得され、`member` / `hasIdentityDocument` state が更新される

#### Scenario: signOut で member クリア
- **WHEN** `signOut()` を呼ぶ
- **THEN** `member` state が `null` に戻り、`hasIdentityDocument` も `false` に戻る
