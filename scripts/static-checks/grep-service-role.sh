#!/usr/bin/env bash
#
# `service_role` の文字列リテラルが apps/*/src/ 配下に出現していないか検査する。
#
# - Edge Function (supabase/functions/) は対象外（service_role 利用可）
# - apps/*/src/ 配下の .ts / .tsx / .vue / .js を検査
# - 発見したら CI fail（GitHub Actions の ::error:: annotation を出力）
# - 検出なしで終了コード 0、検出ありで終了コード 1
#
# 使い方:
#   ./scripts/static-checks/grep-service-role.sh
#
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"

# 検査対象ディレクトリ
TARGETS=(
  "apps/admin/src"
  "apps/reservation/src"
  "apps/lp/src"
)

EXIT_CODE=0
MATCHES=""

for target in "${TARGETS[@]}"; do
  if [ ! -d "$target" ]; then
    continue
  fi
  # grep で service_role 文字列を含む行を抽出
  # --include で対象拡張子を制限、--exclude-dir で dist / node_modules を除外
  if found=$(grep -RnE 'service_role' "$target" \
      --include='*.ts' --include='*.tsx' --include='*.vue' --include='*.js' \
      --exclude-dir='dist' --exclude-dir='node_modules' 2>/dev/null); then
    MATCHES+="$found"$'\n'
    EXIT_CODE=1
  fi
done

if [ "$EXIT_CODE" -ne 0 ]; then
  echo "::error::service_role 文字列がクライアントアプリに出現しています。Edge Function (supabase/functions/) でのみ使用可。"
  echo ""
  echo "$MATCHES"
  exit 1
fi

echo "[OK] service_role 文字列はクライアントアプリ配下に存在しません。"
exit 0
