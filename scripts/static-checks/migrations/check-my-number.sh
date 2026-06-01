#!/usr/bin/env bash
#
# マイナンバー 12 桁 text 列禁止 SOP の機械検知。
#
# 検査内容:
# - supabase/migrations/*.sql 内で text / varchar / char 型かつ列名が以下のパターンの
#   いずれかに該当する CREATE TABLE / ALTER TABLE ADD COLUMN を検出
#     - my_number / mynumber / personal_number / national_id
#     - 個人番号 / マイナンバー
# - 該当ありで終了コード 1 (CI fail)
#
# 対象外（画像メタデータ列等は許容）:
# - 名前パターンに 'image_path' / 'image_url' / 'mask' / 'photo' を含むものは検査スキップ
#
# 使い方:
#   ./scripts/static-checks/migrations/check-my-number.sh
#
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$REPO_ROOT"

MIGRATIONS_DIR="supabase/migrations"

if [ ! -d "$MIGRATIONS_DIR" ]; then
  echo "[SKIP] $MIGRATIONS_DIR が存在しません。"
  exit 0
fi

# 名前パターン (case-insensitive)
NAME_PATTERN='(my_?number|personal_number|national_id|個人番号|マイナンバー)'
# 型パターン
TYPE_PATTERN='(text|varchar|char)'

EXIT_CODE=0
VIOLATIONS=""

shopt -s nullglob
for sql in "$MIGRATIONS_DIR"/*.sql; do
  filename=$(basename "$sql")

  # 各行を取り出して列定義を検査
  # CREATE TABLE 内のカラム定義 + ALTER TABLE ADD COLUMN を検出
  # 形式: `column_name text` / `column_name varchar(N)` 等
  while IFS= read -r line; do
    # 名前パターンに一致するか
    if ! echo "$line" | grep -qiE "$NAME_PATTERN"; then
      continue
    fi
    # 対象外パターンを含むか
    if echo "$line" | grep -qiE '(image_path|image_url|mask|photo)'; then
      continue
    fi
    # 型パターンに一致するか
    if echo "$line" | grep -qiE "[[:space:]]+$TYPE_PATTERN([[:space:]]|\(|,|$)"; then
      VIOLATIONS+="  $filename: $(echo "$line" | sed 's/^[[:space:]]*//')"$'\n'
      EXIT_CODE=1
    fi
  done < "$sql"
done

if [ "$EXIT_CODE" -ne 0 ]; then
  echo "::error::マイナンバー 12 桁を text 型列として保管する migration を検出しました。"
  echo "SOP 違反: docs/06-品質・セキュリティ/08-本人確認書類取扱SOP.md"
  echo ""
  echo "違反箇所:"
  echo "$VIOLATIONS"
  echo "対応: マイナンバーの text 保管は禁止。マスク済み画像 Storage で受け付けてください。"
  exit 1
fi

echo "[OK] マイナンバー text 列禁止 SOP に違反する migration はありません。"
exit 0
