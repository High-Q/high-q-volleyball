#!/usr/bin/env bash
#
# 4 状態 UI テスト存在チェック (warning レベル)。
#
# 検査内容:
# - apps/admin / apps/reservation の widgets/ / features/ / pages/ 配下の .vue ファイルに対し、
#   対応する *.spec.ts ファイルが存在するか
# - 存在する場合、spec ファイル内に Loading / Empty / Error / Success のいずれかを含む
#   test ケース名 (it / test / describe) があるか
# - 対象外:
#     - entities/*/ui/ 配下 (純粋表示用)
#     - shared/ui/ 配下 (shadcn-vue primitives)
#     - *.stories.vue
# - 抜けがあれば warning を出力（CI fail にはしない、終了コード 0）
#
# 使い方:
#   ./scripts/static-checks/grep-4state-tests.sh
#
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"

TARGETS=(
  "apps/admin/src/widgets"
  "apps/admin/src/features"
  "apps/admin/src/pages"
  "apps/reservation/src/widgets"
  "apps/reservation/src/features"
  "apps/reservation/src/pages"
)

MISSING_SPEC=""
MISSING_4STATE=""

for dir in "${TARGETS[@]}"; do
  if [ ! -d "$dir" ]; then
    continue
  fi
  # .vue ファイル一覧 (除外パターン)
  while IFS= read -r vue; do
    [ -z "$vue" ] && continue
    # 除外: *.stories.vue
    if [[ "$vue" == *.stories.vue ]]; then
      continue
    fi
    # 対応する spec ファイル
    base="${vue%.vue}"
    spec_ts="${base}.spec.ts"
    spec_tsx="${base}.spec.tsx"

    if [ ! -f "$spec_ts" ] && [ ! -f "$spec_tsx" ]; then
      MISSING_SPEC+="  - $vue"$'\n'
      continue
    fi

    # 4 状態のいずれかをカバーする test ケース名があるか
    spec_file="$spec_ts"
    [ -f "$spec_tsx" ] && spec_file="$spec_tsx"

    if ! grep -qiE '(Loading|Empty|Error|Success)' "$spec_file"; then
      MISSING_4STATE+="  - $spec_file"$'\n'
    fi
  done < <(find "$dir" -type f -name '*.vue' 2>/dev/null)
done

if [ -n "$MISSING_SPEC" ]; then
  echo "::warning::対応 spec ファイルが存在しない .vue があります。"
  echo ""
  echo "$MISSING_SPEC"
fi

if [ -n "$MISSING_4STATE" ]; then
  echo "::warning::4 状態 (Loading / Empty / Error / Success) のいずれもカバーしない spec があります。"
  echo ""
  echo "$MISSING_4STATE"
fi

if [ -z "$MISSING_SPEC" ] && [ -z "$MISSING_4STATE" ]; then
  echo "[OK] 4 状態 UI テスト存在チェックは全 widget / feature / page で pass しました。"
fi

# warning なので CI fail にしない
exit 0
