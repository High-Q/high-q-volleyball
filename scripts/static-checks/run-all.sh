#!/usr/bin/env bash
#
# 全 static-checks をまとめて実行するラッパー。CI と local 両方で同じコマンドで起動するため、
# ルート package.json の `static-checks` script からも呼び出される。
#
# 各検査は独立に終了コードを返し、本スクリプトはいずれかが非ゼロなら最終的に非ゼロで終了する。
# warning レベルの検査 (rollback-comment / 4state / e2e-count) は本体の終了コードに影響しない。
#
# 使い方:
#   ./scripts/static-checks/run-all.sh
#
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT/.."

CHECKS=(
  "scripts/static-checks/grep-service-role.sh"
  "scripts/static-checks/migrations/check-rls.sh"
  "scripts/static-checks/migrations/check-my-number.sh"
  "scripts/static-checks/migrations/check-rollback-comment.sh"
  "scripts/static-checks/grep-4state-tests.sh"
  "scripts/static-checks/count-e2e-files.sh"
)

FAILED=0
for c in "${CHECKS[@]}"; do
  echo "::group::$c"
  if ! bash "$c"; then
    echo "::error::$c が失敗しました。"
    FAILED=1
  fi
  echo "::endgroup::"
done

if [ "$FAILED" -ne 0 ]; then
  echo "::error::1 件以上の static-check が fail しました。"
  exit 1
fi

echo "[OK] 全 static-checks が pass しました。"
exit 0
