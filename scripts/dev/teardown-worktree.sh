#!/usr/bin/env bash
#
# teardown-worktree.sh — マージ済み worktree とローカルブランチを安全に掃除する
#
# 使い方:
#   scripts/dev/teardown-worktree.sh <issue番号> [--force]
#
# 例:
#   scripts/dev/teardown-worktree.sh 329
#   scripts/dev/teardown-worktree.sh 329 --force
#
# 詳細は docs/03-アーキテクチャ/06-並列開発ガイド.md 参照。

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
REPO_PARENT="$(dirname "$REPO_ROOT")"
REPO_NAME="$(basename "$REPO_ROOT")"

usage() {
  cat <<EOF
Usage: $(basename "$0") <issue番号> [--force]

Arguments:
  <issue番号>     掃除する worktree の Issue 番号

Options:
  --force         未マージでも強制削除する

Example:
  $(basename "$0") 329
  $(basename "$0") 329 --force
EOF
}

# ---- 引数パース --------------------------------------------------------------
FORCE=0
POSITIONAL=()

for arg in "$@"; do
  case "$arg" in
    --force)
      FORCE=1
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    --*)
      echo "ERROR: 未知のオプション: $arg" >&2
      usage >&2
      exit 1
      ;;
    *)
      POSITIONAL+=("$arg")
      ;;
  esac
done

if [ "${#POSITIONAL[@]}" -lt 1 ]; then
  echo "ERROR: Issue 番号が必要" >&2
  usage >&2
  exit 1
fi

ISSUE_NUMBER="${POSITIONAL[0]}"

if ! [[ "$ISSUE_NUMBER" =~ ^[0-9]+$ ]]; then
  echo "ERROR: Issue 番号は数値のみ (受領: $ISSUE_NUMBER)" >&2
  exit 1
fi

# ---- 対象 worktree 特定 ------------------------------------------------------
cd "$REPO_ROOT"

WT_PATH="${REPO_PARENT}/${REPO_NAME}-wt-${ISSUE_NUMBER}"

if ! git worktree list --porcelain | grep -qE "^worktree ${WT_PATH}$"; then
  echo "ERROR: Issue #${ISSUE_NUMBER} の worktree は存在しません: ${WT_PATH}" >&2
  exit 1
fi

# 対象ブランチ名を取得
BRANCH_NAME="$(git -C "$WT_PATH" rev-parse --abbrev-ref HEAD)"

if [ -z "$BRANCH_NAME" ] || [ "$BRANCH_NAME" = "HEAD" ]; then
  echo "ERROR: worktree のブランチを特定できません: ${WT_PATH}" >&2
  exit 1
fi

# ---- マージ済み検証 ----------------------------------------------------------
git fetch origin --quiet

MERGED=0
if git branch --merged origin/master 2>/dev/null | grep -qE "^[ *]+${BRANCH_NAME}$"; then
  MERGED=1
fi

if [ "$MERGED" -eq 0 ]; then
  if [ "$FORCE" -ne 1 ]; then
    cat <<EOF >&2
ERROR: ブランチ '${BRANCH_NAME}' は origin/master にマージされていません。

未マージのまま削除すると作業を失う可能性があります。
本当に削除する場合は --force を付けて再実行してください。

  scripts/dev/teardown-worktree.sh ${ISSUE_NUMBER} --force
EOF
    exit 1
  else
    echo "WARN: --force 指定により未マージブランチを削除します: ${BRANCH_NAME}" >&2
  fi
fi

# ---- worktree 削除 -----------------------------------------------------------
echo "==> git worktree remove ${WT_PATH}"
if [ "$FORCE" -eq 1 ] && [ "$MERGED" -eq 0 ]; then
  git worktree remove --force "$WT_PATH"
else
  git worktree remove "$WT_PATH"
fi

# ---- ローカルブランチ削除 ----------------------------------------------------
if [ "$MERGED" -eq 1 ]; then
  echo "==> git branch -d ${BRANCH_NAME}"
  git branch -d "$BRANCH_NAME"
else
  echo "==> git branch -D ${BRANCH_NAME}"
  git branch -D "$BRANCH_NAME"
fi

# ---- 完了サマリ --------------------------------------------------------------
cat <<EOF

============================================================
✅ teardown 完了

issue:        #${ISSUE_NUMBER}
worktree:     ${WT_PATH} (削除済み)
branch:       ${BRANCH_NAME} (削除済み)
merged:       $([ "$MERGED" -eq 1 ] && echo "yes" || echo "no (--force)")
============================================================
EOF
