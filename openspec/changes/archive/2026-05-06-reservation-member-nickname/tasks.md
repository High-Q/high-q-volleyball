## 1. Setup

- [x] 1.1 ブランチを作成する: `git checkout -b feature/200-reservation-member-nickname`

## 2. DB migration

- [x] 2.1 `supabase/migrations/<timestamp>_add_members_nickname.sql` を新規作成し、`members.nickname` 列を `text NULL` で追加する
- [x] 2.2 同 migration 内に CHECK 制約 `members_nickname_chars_chk` を追加する。条件は `nickname IS NULL OR (char_length(nickname) BETWEEN 1 AND 15 AND nickname ~ '^[ぁ-ゖァ-ヺー一-鿿a-zA-Z]+$')`（ひらがな U+3041–U+3096 / カタカナ U+30A1–U+30FA + 長音符 U+30FC / CJK 統合漢字基本ブロック U+4E00–U+9FFF / 半角英字 ASCII の和集合、長さ 1〜15 文字）
- [x] 2.3 同 migration 内に既存 dev 会員への初期値投入 UPDATE を含める: `UPDATE members SET nickname = 'たろ' WHERE email = 'high.q.volleyball@gmail.com' AND nickname IS NULL;`（冪等性を担保する条件節）
- [x] 2.4 dev Supabase に migration を適用し、`select id, email, nickname from members` で翔太郎くん 1 行に `nickname='たろ'` が入っていることを確認する（レム自身が `pnpm db:push` 等で実行）
- [x] 2.5 CHECK 制約の動作確認 SQL を psql / Studio で実行し、不正値（`'たろ123'` / `'たろ★'` / `'たろ🏐'` / 16 文字以上）が拒否されることを確認する

## 3. データベース型 + ドメイン層 (Smart constructor)

- [x] 3.1 `apps/reservation/src/entities/member/model/member.types.ts` の `Member` 型と `MemberRow` 型に `nickname: string | null` を追加する
- [x] 3.2 `apps/reservation/src/entities/member/model/nickname.ts` を新規作成し、Smart constructor `createNickname(value: string): string` と妥当性チェック関数を実装する。空文字 / 半角空白のみ / 16 文字以上 / 文字種違反（数字 / 記号 / 絵文字を含む）を例外で弾く。許容文字種は migration の CHECK 制約と同じ正規表現 `^[ぁ-ゖァ-ヺー一-鿿a-zA-Z]+$` を使う
- [x] 3.3 同ファイルに「未設定許容版」の `validateOptionalNickname(value: string): string | null` を実装する。空文字 / undefined のときは `null` を返し、値が入っているときのみ `createNickname` でバリデーションする
- [x] 3.4 `nickname.ts` の Vitest UT を `nickname.spec.ts` で書く: 正常値（「たろ」「ミサキ」「Taro」「タロウ太郎」「ロングニックネームabc」15 文字）、空文字エラー、16 文字以上エラー、数字・記号・絵文字エラー、`validateOptionalNickname` の空文字 → null パターン
- [x] 3.5 `apps/reservation/src/entities/member/index.ts` の Public API に `createNickname` / `validateOptionalNickname` を追加 export する

## 4. データアクセス層 (member-client)

- [x] 4.1 `apps/reservation/src/entities/member/api/member-client.ts` の `rowToMember` に `nickname: row.nickname` を追加する
- [x] 4.2 同ファイルの `UpdateMemberPayload` 型に `nickname: string | null` を追加する
- [x] 4.3 同ファイルの `updateMyMember` の UPDATE オブジェクトに `nickname: payload.nickname` を含める
- [x] 4.4 `member-client.spec.ts` の MemberRow fixture / Update fixture に nickname を加え、ロジック整合の Vitest UT を更新する（正常 nickname 文字列の往復 / NULL 値の往復 / UPDATE 引数に nickname が含まれる確認）

## 5. composable (useCompleteProfile)

- [x] 5.1 `apps/reservation/src/features/auth/composables/useCompleteProfile.ts` の `ProfileFormData` 型に `nickname: string` を追加する
- [x] 5.2 同ファイルの `ProfileFieldErrors` キーに `'nickname'` を追加する
- [x] 5.3 `submit` 関数で `validateOptionalNickname(form.nickname)` を呼び、エラー時は `errs.nickname = (e as Error).message` にメッセージをセットする
- [x] 5.4 `updateMyMember` 呼び出し payload に `nickname: validatedNickname` (string | null) を含める
- [x] 5.5 `useCompleteProfile.spec.ts` を更新し、ニックネーム正常値・空欄（→ null）・文字数違反・文字種違反（数字/記号/絵文字）の Vitest UT を追加する

## 6. UI (SignupProfilePage)

- [x] 6.1 `apps/reservation/src/pages/SignupProfilePage.vue` の `form` reactive オブジェクトに `nickname: ""` を追加する
- [x] 6.2 氏名 FormField の直後に「ニックネーム」FormField を追加する。プロパティは `label="ニックネーム"`、`hint="未入力時は氏名で表示されます · 1〜15 文字 · 日本語と英字のみ"`、`:error="fieldErrors.nickname"`。Input の `placeholder="例: ミサキ"`、`autocomplete="nickname"`、`:disabled="isLoading"`。**必須マーク `*` は付けない**（プロジェクト UI 規約）
- [x] 6.3 `onSubmit` の `submit()` 引数に `nickname: form.nickname` を含める
- [x] 6.4 `SignupProfilePage.spec.ts` を更新し、ニックネームフィールドの存在 / 任意表記（必須マークなし・ヒント文）/ エラー時の表示の Vitest コンポーネントテストを追加する

## 7. 最終確認 (UI 変更タスクをまとめて検証)

- [x] 7.1 `pnpm --filter @high-q/reservation typecheck` を実行し型エラーなしを確認する
- [x] 7.2 `pnpm --filter @high-q/reservation test` で全テストが pass することを確認する（追加した UT が組み込まれて緑、既存テストが壊れていない）
- [x] 7.3 `pnpm --filter @high-q/reservation build` がエラーなく完了することを確認する
- [x] 7.4 ローカル `pnpm --filter @high-q/reservation dev` を起動し、認証済み + プロフィール未完成の状態で `/signup/profile` を開いてニックネーム入力欄が表示されること、空欄送信が成功すること、不正値（数字 / 記号 / 絵文字 / 16 文字超）でフィールドエラーが出ることを手動確認する（翔太郎くん 2026-05-07 OK サイン）
- [x] 7.5 dev DB を直接確認し、ニックネーム入力ありで登録した会員行に nickname 列が正しく保存されていること、空欄送信した会員行が NULL になっていることを確認する（テスト終了後は手動で UPDATE で初期値「たろ」に戻す）
- [x] 7.6 grep で会員視点で名前を表示している既存箇所がないことを再確認する（`apps/reservation/src/pages/` `apps/reservation/src/widgets/` `apps/reservation/src/features/` 配下で `displayName` / `display_name` 直書き、`member.displayName` 参照）
- [x] 7.7 翔太郎くんへの完了報告を作成する。`apps/reservation` のみの UI 変更 + DB migration のため CLAUDE.md ルールに従い「Render PR Preview は生成されないためローカル `pnpm --filter @high-q/reservation dev` で動作確認をお願いします」と明記する（PR #209 で起票）
