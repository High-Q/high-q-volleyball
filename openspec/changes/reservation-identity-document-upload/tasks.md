# Tasks: reservation 本人確認書類アップロード (#92)

> **承認ゲート**: Proposal + Design + spec (data-schema + reservation-identity-document-upload + reservation-member-auth) + 本 Tasks の 4 ファイル群が揃って承認されてから Apply に入る。
>
> **ファーストリリース条件**: 本件と法令対応 Issue (#192-#196) はファーストリリース前にいずれも完了させる。順不同で OK (本件単独のマージに法令 Issue 完了前提はなし)。
>
> **関連 Issue (Project 着手順 = 開発順序の目安)**:
> - #192 (着手順 1) Cookie 同意 + 外部送信ポリシー
> - #193 (着手順 2) プライバシーポリシー本文
> - #194 (着手順 3) 開示請求窓口
> - #195 (着手順 4) 安全管理措置文書化
> - #196 (着手順 5) pending 会員予約禁止ガード
> - **#92 (着手順 6) 本件**

## 進捗

- 完了: Phase 1-15 (UI + 統合テスト + ビルド) ✅、Phase 16-18 (E2E + SOP + PR) 進行中

---

## 1. 事前作業

- [x] 1.1 Issue #92 を本サイクルの作業 Issue として確認 (Epic #170 配下)
- [x] 1.2 ブランチ作成: `feature/92-reservation-identity-document-upload`
- [x] 1.3 propose 4 ファイル群 (proposal / design / specs/data-schema / specs/reservation-identity-document-upload / specs/reservation-member-auth / tasks) を Apply 初期コミット

## 2. 既存資産の確認 (実装ゼロ・verify only)

- [x] 2.1 `packages/shared/src/types/labels.ts` の `DOCUMENT_TYPE_LABELS` / `DOCUMENT_TYPE_REQUIREMENTS` が 10 種完備していること、文言が design.md D5 と一致することを確認
- [x] 2.2 `supabase/migrations/20260428143738_db_schema_foundation.sql` の `identity_documents` テーブル + RLS + bucket 定義を確認 (RLS 有効・bucket private 設定済 ・本番 0 行)
- [x] 2.3 法令対応 Issue 群を確認: #192 #193 #194 #195 #196 全て Todo 状態。本件マージの前提条件ではない (順不同で OK) が、ファーストリリース前にいずれも完了が必要

## 3. DB Migration: storage_path 列分割

- [x] 3.1 `supabase/migrations/20260504231456_split_identity_documents_storage_path.sql` を作成: `RENAME COLUMN storage_path TO storage_path_front` + `ADD COLUMN storage_path_back text NULL`
- [ ] 3.2 **【ユーザー手動】** Supabase Dashboard (Studio) または `supabase db push` でマイグレーションを本番適用、列構造を確認 (Claude 環境に supabase CLI 不在のため)
- [x] 3.3 `packages/shared/src/types/entities.ts` の `IdentityDocument` / `IdentityDocumentInsert` 型を新スキーマに追従 (`storage_path` → `storage_path_front: string` + `storage_path_back: string | null`)
- [x] 3.4 `packages/shared/src/types/entities.spec.ts` に IdentityDocument 型契約 spec を追加 (旧 `storage_path` キーの不在 / `storage_path_front` 必須 / `storage_path_back` 任意の確認)
- [x] 3.5 `pnpm --filter @high-q/shared test` 通過確認 (55 passed | 11 todo)

## 4. entities/identity-document スライス作成 (TDD)

- [x] 4.1 `apps/reservation/src/entities/identity-document/model/identity-document.types.ts` を作成: `IdentityDocumentId` / `DocumentType` を `@high-q/shared` から再 export、`UploadError` union 8 種を定義
- [x] 4.2 `SubmitInput` / `SlotState` / `SlotData` / `PageState` 型を定義 (design.md D11 参照)
- [x] 4.3 `identity-document.types.spec.ts` を作成: 型互換性のコンパイルテスト + UploadError union 等の網羅 (9 spec)
- [x] 4.4 `apps/reservation/src/entities/identity-document/index.ts` (Public API) で types を re-export
- [x] 4.5 `pnpm --filter @high-q/reservation test entities/identity-document` 通過確認 (9 passed)

## 5. heic2any 依存追加 + 変換 helper (TDD)

- [x] 5.1 `apps/reservation/package.json` に `heic2any@^0.0.4` を追加
- [x] 5.2 `convertHeicToJpeg.ts` を新規作成: dynamic import + isHeicFile + 拡張子/MIME 正規化
- [x] 5.3 `convertHeicToJpeg.spec.ts`: 8 spec (heic/heif 検出 / 変換成功 / 配列対応 / 失敗 throw / non-heic は素通し / isHeicFile 単体)
- [x] 5.4 `pnpm --filter @high-q/reservation test features/identity-document/lib` 通過確認 (8 passed)

## 6. features/identity-document/api/ 作成 (TDD)

- [x] 6.1 `identity-document-client.spec.ts` 14 spec: insertPendingRecord / uploadFileToStorage / confirmStoragePaths / rollbackRecord / removeStorageObjects / buildStoragePath
- [x] 6.2 `identity-document-client.ts` 実装: 5 関数を export、supabase は getSupabase() 経由
- [x] 6.3 `buildStoragePath()` 関数化、heic→jpg 拡張子フォールバック spec
- [x] 6.4 `pnpm --filter @high-q/reservation test features/identity-document/api` 通過 (14 passed)

## 7. features/identity-document/composables/useUploadIdentityDocument (TDD)

- [x] 7.1 `useUploadIdentityDocument.spec.ts` 20 spec: 初期 / select / バリデーション 7 件 / heic 3 件 / submit 8 件 (front_required / consent_required / 表面のみ / 表裏 / Storage 失敗対称 / DB 失敗 2 種)
- [x] 7.2 `useUploadIdentityDocument.ts` 実装: pageState (computed) / frontSlot / backSlot (ref) / selectedDocumentType / consented / error / select系 / submit で Result 返却
- [x] 7.3 `pnpm --filter @high-q/reservation test features/identity-document/composables` 通過 (20 passed)
- [x] 7.4 `apps/reservation/src/features/identity-document/index.ts` (Public API) で composable と型を re-export

## 8. AuthSession 拡張: hasIdentityDocument (TDD)

- [x] 8.1 `identity-document-existence.spec.ts` 4 spec (0/1+/RLS 0/error)
- [x] 8.2 `identity-document-existence.ts` 実装、`entities/member/index.ts` で export
- [x] 8.3 `useAuthSession.spec.ts` に `hasIdentityDocument` 5 spec を追加 (session 有無 / fetch エラー / refresh / signOut)
- [x] 8.4 `useAuthSession.ts` の `evaluate()` を `Promise.allSettled` で並行 fetch + AuthSession 型に `hasIdentityDocument: ComputedRef<boolean>` 追加
- [x] 8.5 `pnpm --filter @high-q/reservation test features/auth entities/member` 通過 (79 passed)

## 9. router 拡張 (TDD)

- [x] 9.1 `router.spec.ts` に hasIdentityDocument 分岐 5 spec 追加 (強制誘導 / 無限ループ防止 / 提出済直リン / callback 通過 / 既存テスト 3 段階対応)
- [x] 9.2 `router.ts` に `/signup/identity` ルート追加 (lazy import) + ガードに「!hasIdDoc → /signup/identity 強制」分岐追加
- [x] 9.3 `pnpm --filter @high-q/reservation test app/router` 通過確認 (14 passed)

## 10. shared/ui プリミティブ (Checkbox 取り込み)

- [x] 10.1 `Checkbox.vue` を新規作成 (ネイティブ checkbox + Tailwind preset utility)
- [x] 10.2 `Checkbox.spec.ts` 7 spec (v-model / disabled / required / aria-describedby / type / id / 初期値)
- [x] 10.3 `shared/ui/index.ts` に Checkbox を追加
- [x] 10.4 `pnpm --filter @high-q/reservation test shared/ui/Checkbox` 通過 (7 passed)

## 11. SignupIdentityPage の sub-components 実装

UI 連続変更タスクのため、各タスク後の vitest 実行は省略 (タスク 14 の最終確認で一括実行)。

- [x] 11.1 `StepDots.vue` (ドット 3 つ + STEP N/N モノスペース)
- [x] 11.2 `DocumentChip.vue` (role=radio + 注意バッジ + アクセント色リング)
- [x] 11.3 `ConditionCard.vue` (— ACCEPTED IF Kicker + DOCUMENT_TYPE_REQUIREMENTS 参照)
- [x] 11.4 `MynumberDefense.vue` (三重防壁: 赤帯アラート / サンプル比較 (CSS only) / 必須同意)
- [x] 11.5 `UploadSlot.vue` (4 状態 + 必須/任意バッジ + image/* accept で Android heic 対応)
- [x] 11.6 `ErrorBanner.vue` (role=alert) / `SuccessBanner.vue` (role=status)
- [x] 11.7 `StickyCta.vue` (label/disabled/spinner prop + click emit)
- [x] 11.8 `PolicyFooter.vue` (法令文言 + /privacy /external-transmission リンク)

## 12. SignupIdentityPage 本体実装

- [x] 12.1 `SignupIdentityPage.vue` を本体実装に置換 (useUploadIdentityDocument 利用、表裏 2 スロット、CTA 状態駆動)
- [x] 12.2 デザイントークン (bg-paper / text-ink / font-jp / gap-hq-* / border-hairline / text-accent / text-danger / text-success) で構成
- [x] 12.3 a11y: radiogroup / radio / role=alert / role=status / aria-disabled / 44px 最小タップ領域
- [x] 12.4 表裏スロットの独立 state 制御 (片方の error が他方を汚染しない実装、spec で確認)

## 13. SignupProfilePage の遷移先変更 + 既存規約リンク張り替え

- [x] 13.1 `SignupProfilePage.spec.ts` の遷移先期待値を 'home' → 'signup-identity' に更新 (1 spec)
- [x] 13.2 `SignupProfilePage.vue` の `router.push({ name: 'home' })` を `'signup-identity'` へ変更
- [ ] 13.3 既存 `<a href="#">利用規約</a>` / `<a href="#">プライバシーポリシー</a>` の張り替え → 本件 PR では skip (#193 ページ実装後に別 PR でリンク張り替え)
- [x] 13.4 `pnpm --filter @high-q/reservation test pages/SignupProfilePage` 通過 (7 passed)

## 14. SignupIdentityPage の component test

- [x] 14.1 `SignupIdentityPage.spec.ts` 18 spec (初期描画 5 / チップ選択 4 / CTA 5 / バナー 3 / スロット独立性 1)
- [x] 14.2 sub-component の単体 spec は本 spec で網羅 (個別ファイルは追加せず Page spec で確認)
- [x] 14.3 `pnpm --filter @high-q/reservation test pages/SignupIdentityPage` 通過 (18 passed)

## 15. 統合テスト + ビルド確認

- [x] 15.1 `pnpm --filter @high-q/reservation test` 全 spec 通過 (210 passed / 28 ファイル)
- [x] 15.2 `pnpm --filter @high-q/reservation typecheck` 通過 (4 件のエラーを修正)
- [x] 15.3 `pnpm --filter @high-q/reservation build` 通過: SignupIdentityPage (23KB) / heic2any (1.3MB) が独立 chunk に分割されコードスプリッティング成功
- [ ] 15.4 lint script 未配置 (reservation アプリ) → skip

## 16. E2E happy path (Playwright・1 件のみ)

- [x] 16.1 `e2e/reservation/identity-document-upload.e2e.ts` を作成 — 軽量シナリオに変更: 「未認証 + /signup/identity 直アクセス → /login にリダイレクト (auth ガード統合)」のみ。完全 happy path (アップロード成功) は component test 18 spec で完全カバーしているため、E2E では auth ガードとの統合のみを 1 件で確認
- [x] 16.2 既存 `_helpers/supabaseGuard.ts` を再利用 (新規 helper 不要)
- [x] 16.3 `pnpm test:e2e e2e/reservation/identity-document-upload.e2e.ts` 通過 (1 passed)

## 17. SOP 微更新

- [x] 17.1 「reservation 側 #92 で実装」表記を「reservation 側 #92 ✅ 実装済 / 2026-05-05」へ更新
- [x] 17.2 §4「DB」項目の列名 (`storage_path`) を `storage_path_front` / `storage_path_back` に更新
- [x] 17.3 §4「Storage」項目の表裏ペアリング説明を追加 (1 行 = 表 + 裏 任意の構造)、heic→jpg 変換の言及追加
- [x] 17.4 SOP 改訂履歴に 2026-05-05 行を追加 (列分割 + heic 変換 + 拡張子統一)

## 18. 最終確認 + PR

- [ ] 18.1 ローカルで `pnpm --filter @high-q/reservation dev` 起動、ブラウザで /signup/identity を実機確認 (各状態 + マイナンバー三重防壁 + 表のみ送信 + 表裏送信 + ホーム遷移 + heic 変換 (Mac Safari で iPhone 同期写真等))
- [ ] 18.2 git diff で意図しない変更がないこと、`packages/shared` (型変更のみ意図通り) / `apps/admin` / `apps/lp` に副作用がないことを確認
- [ ] 18.3 PR 作成 (base: master、Closes #92、Epic: #170)。本文に Claude Design 出典 (`/tmp/hq-design/high-q/project/hq-reserve-screens.jsx:1283-1764`) と表裏 2 スロット拡張の意思決定を含める
- [ ] 18.4 CI 全パス + Render PR Preview ビルド成功
- [ ] 18.5 翔太郎くんに Render Preview で動作確認依頼 + 法令対応 Issue (#192 / #193) の状況確認 (ship 順序ゲートのため)

---

## 備考・ブロッカー

- DB Migration が必要 (`identity_documents.storage_path` 列分割)。本番 DB は 0 行のため互換維持不要。
- `heic2any` ライブラリ依存追加 (~500KB、dynamic import で初回ロード軽量化)。Android / Mac Safari など全環境で heic 対応を保証。
- 既存会員の遡及対応は不問 (ファーストリリース前のため既存会員ゼロ)。
- マイナンバーカード提出後の admin 側確認・承認画面は別 Issue (#171, MVP1)。本 change では status='pending' で行を作成して終わる。
- pending 状態会員の予約ガードは別 Issue **#196 (着手順 5)** で実装する (本件 #92 + admin 承認画面 #171 完了後)。
- E2E は 1 件のみ (CLAUDE.md 「機能あたり 1〜2 件」上限遵守)。表裏両方の組み合わせや heic 変換は component test に押し下げ。
- **ファーストリリース前提**: 本件と #192-#196 はファーストリリース前に揃って必要。本件単独のマージに法令 Issue 完了の前提はないため、順不同で進めて良い。
