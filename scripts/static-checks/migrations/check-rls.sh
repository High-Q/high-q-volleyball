#!/usr/bin/env bash
#
# 新規 migration の RLS ポリシー網羅性を検査する。
#
# 検査内容:
# - supabase/migrations/*.sql 内に `create table` を含むファイルに対し、同ファイル内に
#   `enable row level security` と `create policy` が両方存在するか確認
# - 既存ファイル (migrations-allowlist.txt に列挙) は対象外
# - 違反ありで終了コード 1 (CI fail)
#
# 使い方:
#   ./scripts/static-checks/migrations/check-rls.sh
#
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$REPO_ROOT"

ALLOWLIST_FILE="scripts/static-checks/migrations-allowlist.txt"
MIGRATIONS_DIR="supabase/migrations"

if [ ! -d "$MIGRATIONS_DIR" ]; then
  echo "[SKIP] $MIGRATIONS_DIR が存在しません。"
  exit 0
fi

# allowlist 読み込み (存在しない場合は空)
ALLOWLIST=""
if [ -f "$ALLOWLIST_FILE" ]; then
  # コメント行 (#) と空行を除外
  ALLOWLIST=$(grep -vE '^\s*(#|$)' "$ALLOWLIST_FILE" 2>/dev/null || true)
fi

EXIT_CODE=0
VIOLATIONS=""

shopt -s nullglob
for sql in "$MIGRATIONS_DIR"/*.sql; do
  filename=$(basename "$sql")

  # allowlist に含まれる場合は skip
  if echo "$ALLOWLIST" | grep -qxF "$filename" 2>/dev/null; then
    continue
  fi

  # create table を含むか確認 (case-insensitive)
  if ! grep -qiE 'create[[:space:]]+table' "$sql"; then
    continue
  fi

  # RLS enable と policy の両方が存在するか
  has_rls=0
  has_policy=0
  if grep -qiE 'enable[[:space:]]+row[[:space:]]+level[[:space:]]+security' "$sql"; then
    has_rls=1
  fi
  if grep -qiE 'create[[:space:]]+policy' "$sql"; then
    has_policy=1
  fi

  if [ "$has_rls" -eq 0 ] || [ "$has_policy" -eq 0 ]; then
    msg="$filename: "
    [ "$has_rls" -eq 0 ] && msg+="[RLS enable 無し] "
    [ "$has_policy" -eq 0 ] && msg+="[policy 無し]"
    VIOLATIONS+="  - $msg"$'\n'
    EXIT_CODE=1
  fi
done

if [ "$EXIT_CODE" -ne 0 ]; then
  echo "::error::新規 migration に RLS ポリシーの定義が不足しています。"
  echo ""
  echo "違反 migration:"
  echo "$VIOLATIONS"
  echo "対応: 該当 migration に 'alter table <name> enable row level security;' と"
  echo "      'create policy ... on <name> for select using (...);' 等を追加してください。"
  exit 1
fi

echo "[OK] 新規 migration の RLS ポリシー定義は網羅されています。"
exit 0
