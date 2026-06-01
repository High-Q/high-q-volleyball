#!/usr/bin/env bash
#
# 新規 migration にロールバック手順コメントの存在を warning レベルで検査する。
#
# 検査内容:
# - supabase/migrations/*.sql 内に `-- ROLLBACK:` または `-- rollback:` で始まる行があるか
# - 既存ファイル (migrations-allowlist.txt に列挙) は対象外
# - 無い場合 GitHub Actions の ::warning:: annotation を出力
# - warning は CI fail にしない（常に終了コード 0）
#
# 使い方:
#   ./scripts/static-checks/migrations/check-rollback-comment.sh
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

ALLOWLIST=""
if [ -f "$ALLOWLIST_FILE" ]; then
  ALLOWLIST=$(grep -vE '^\s*(#|$)' "$ALLOWLIST_FILE" 2>/dev/null || true)
fi

MISSING=""

shopt -s nullglob
for sql in "$MIGRATIONS_DIR"/*.sql; do
  filename=$(basename "$sql")

  if echo "$ALLOWLIST" | grep -qxF "$filename" 2>/dev/null; then
    continue
  fi

  # ロールバックコメントの存在確認
  if ! grep -qiE '^[[:space:]]*--[[:space:]]*rollback[[:space:]]*:' "$sql"; then
    MISSING+="  - $filename"$'\n'
  fi
done

if [ -n "$MISSING" ]; then
  echo "::warning::ロールバック手順コメント (-- ROLLBACK: ...) が無い新規 migration があります。"
  echo ""
  echo "対象 migration:"
  echo "$MISSING"
  echo "推奨: 各 migration の末尾に '-- ROLLBACK: drop table foo;' 等のコメントを追記してください。"
  # warning なので終了コードは 0
fi

echo "[OK] ロールバックコメント検査完了 (warning は上記のみ)。"
exit 0
