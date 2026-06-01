#!/usr/bin/env bash
#
# E2E ファイル数の機能あたり閾値超過を warning する。
#
# 検査内容:
# - apps/*/e2e/*.e2e.ts のファイル名から「機能 prefix」を抽出 (例: booking-create.e2e.ts → booking)
# - 機能あたり 3 ファイル以上で warning
# - CLAUDE.md「E2E スケーラビリティ運用ルール」と整合: 機能あたり 1〜2 件まで
# - 終了コード 0 (warning のみ)
#
# 使い方:
#   ./scripts/static-checks/count-e2e-files.sh
#
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"

WARNINGS=""

for app_dir in apps/*/; do
  e2e_dir="${app_dir}e2e"
  if [ ! -d "$e2e_dir" ]; then
    continue
  fi

  # ファイル名一覧 → prefix 抽出 (最初の '-' まで、なければファイル名そのまま)
  declare -A counts=()
  while IFS= read -r f; do
    [ -z "$f" ] && continue
    base=$(basename "$f" .e2e.ts)
    # prefix: 最初の '-' まで
    prefix="${base%%-*}"
    counts["$prefix"]=$((${counts["$prefix"]:-0} + 1))
  done < <(find "$e2e_dir" -maxdepth 1 -type f -name '*.e2e.ts' 2>/dev/null)

  for prefix in "${!counts[@]}"; do
    n=${counts[$prefix]}
    if [ "$n" -ge 3 ]; then
      WARNINGS+="  - $app_dir e2e: 機能 '$prefix' に $n ファイル (閾値 3 件以上)"$'\n'
    fi
  done
  unset counts
done

if [ -n "$WARNINGS" ]; then
  echo "::warning::E2E ファイル数が機能あたり 3 件以上の機能があります。CLAUDE.md「E2E スケーラビリティ運用ルール」参照。"
  echo ""
  echo "$WARNINGS"
  echo "対応: 詳細バリエーションは component test に降ろし、E2E は happy path + 主要 edge case に絞ってください。"
else
  echo "[OK] 全機能で E2E ファイル数が 2 件以下です。"
fi

exit 0
