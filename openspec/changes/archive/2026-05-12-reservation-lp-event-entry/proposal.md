## Why

LP 刷新 (#160) で「予約する」最終 CTA と各イベントカードは reservation サイトへ遷移する設計となった。LP 側はイベント識別子を URL に乗せて渡すだけで、認証分岐とリダイレクトは reservation 側の責務である。

現在の reservation auth guard は、未認証ユーザーを `/login` に飛ばす際に元の遷移先を破棄してしまうため、ログイン完了後に LP が意図したイベントへ戻れない。会員登録経路 (`/signup` → `/signup/verify` → `/signup/identity`) を経由する場合も同様に意図したイベントを失う。

本変更では、LP から渡されたイベント識別子を認証導線の各段階で持ち回し、認証完了後に該当イベントへ自動到達させる入口機構を整備する。

## What Changes

- LP からのイベント指定遷移を受ける **入口は既存の `/events/:id` ルートを流用する** (新規 URL は追加しない)
- reservation の auth guard を拡張し、未認証時に元の遷移先を `next` クエリで保持して `/login` にリダイレクトする
- ログイン (既会員) ・新規会員登録の各画面 (`/login` / `/signup` / `/signup/verify` / `/signup/identity` / `/auth/callback`) で `next` を引き継ぎ、最終的に本人確認書類提出が完了した時点で `next` 先へ navigate する
- マジックリンクメールの `emailRedirectTo` にも `next` を埋め込み、別タブ・別端末でメールを開いた場合でも遷移先が維持される
- `next` 値は同一 origin のパス記法のみ受理する open redirect ガードを共通ヘルパとして実装する
- 不正 / 非公開イベント ID の場合は既存の EventDetailPage 「該当なし」状態 (一覧へ戻る導線あり) を再利用する。本変更で新規エラー画面は追加しない

## Capabilities

### Modified Capabilities

- `app-routing`: reservation の auth guard が、未認証時に元の遷移先を `next` クエリで保持して `/login` にリダイレクトする挙動を追加する
- `reservation-member-auth`: `/login` / `/signup` / `/signup/verify` / `/signup/identity` / `/auth/callback` の各画面が `next` クエリを引き継ぎ、認証フロー完了時に `next` 先へ navigate する挙動を追加する

## Impact

- 影響アプリ: `apps/reservation` の auth guard と auth 系画面 (5 画面)
- 共通基盤: open redirect ガード関数を `shared/lib/` に新規追加
- 環境変数 / Supabase Auth 設定: 既存の Site URL ホワイトリストは origin 単位で機能するため変更不要
- 関連 Issue: #160 (LP 刷新本体) と並行可、相互独立。本変更が先行すると LP リリース時の動作が確実になる
- 切り出し済み別 Issue:
  - LP 側 CTA / カード差し替え (#160)
  - reservation の予約フロー本体改修 (Bottom Sheet 等、既存 capability で運用)
- スコープ外:
  - LP 側 CTA / カード実装
  - 予約 Bottom Sheet 自動展開などログイン後 UX 拡張
  - メール / プッシュ通知追加
  - 新規ルート (`/events/:id/book` 等) 追加
