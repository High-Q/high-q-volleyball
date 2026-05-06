-- #200 会員サイトでの自己呼称をニックネームで運用するための列追加。
-- 仕様: openspec/changes/reservation-member-nickname/specs/data-schema/spec.md
--      （MODIFIED: members テーブル）
--
-- ・nickname は任意項目（NULL 許可）
-- ・1〜15 文字、ひらがな/カタカナ/CJK 統合漢字基本ブロック/半角英字 ASCII のみ
-- ・絵文字・数字・記号は CHECK で拒否
-- ・一意性制約は付与しない（同名 OK の運用、Issue #200 Non-Goals）

ALTER TABLE members
  ADD COLUMN nickname text NULL;

ALTER TABLE members
  ADD CONSTRAINT members_nickname_chars_chk CHECK (
    nickname IS NULL
    OR (
      char_length(nickname) BETWEEN 1 AND 15
      AND nickname ~ '^[ぁ-ゖァ-ヺー一-鿿a-zA-Z]+$'
    )
  );

-- dev 環境の既存会員 1 名（翔太郎くん）にテスト用初期値を投入する。
-- 本番環境では当該行が存在しないため UPDATE 0 件で安全に終了する。
-- 冪等性: nickname IS NULL 条件により再適用しても二重 UPDATE にならない。
UPDATE members
SET    nickname = 'たろ'
WHERE  email = 'high.q.volleyball@gmail.com'
  AND  nickname IS NULL;
