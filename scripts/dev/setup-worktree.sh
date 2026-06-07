#!/usr/bin/env bash
#
# setup-worktree.sh — 2 並列開発用の git worktree を 1 コマンドで構築する
#
# 使い方:
#   scripts/dev/setup-worktree.sh <issue番号> <slug> [--type=feature|fix|chore] [--force-main]
#
# 例:
#   scripts/dev/setup-worktree.sh 329 add-foo
#   scripts/dev/setup-worktree.sh 330 fix-bar --type=fix
#
# 詳細は docs/03-アーキテクチャ/06-並列開発ガイド.md 参照。

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
REPO_PARENT="$(dirname "$REPO_ROOT")"
REPO_NAME="$(basename "$REPO_ROOT")"

BASE_PORT_ADMIN=5173
BASE_PORT_RESERVATION=5174
PORT_STEP=100

usage() {
  cat <<EOF
Usage: $(basename "$0") <issue番号> <slug> [--type=feature|fix|chore] [--force-main]

Arguments:
  <issue番号>     GitHub Issue 番号 (数値のみ)
  <slug>          ブランチ名 suffix (kebab-case, [a-z0-9-]+)

Options:
  --type=TYPE     ブランチ prefix (feature|fix|chore, default: feature)
  --force-main    メインリポジトリが master + dirty でも続行する

Example:
  $(basename "$0") 329 add-foo
  $(basename "$0") 330 fix-bar --type=fix
EOF
}

# ---- 引数パース --------------------------------------------------------------
TYPE="feature"
FORCE_MAIN=0
POSITIONAL=()

for arg in "$@"; do
  case "$arg" in
    --type=*)
      TYPE="${arg#--type=}"
      ;;
    --force-main)
      FORCE_MAIN=1
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

if [ "${#POSITIONAL[@]}" -lt 2 ]; then
  echo "ERROR: 引数不足 (<issue番号> <slug> が必要)" >&2
  usage >&2
  exit 1
fi

ISSUE_NUMBER="${POSITIONAL[0]}"
SLUG="${POSITIONAL[1]}"

# ---- 引数検証 ----------------------------------------------------------------
if ! [[ "$ISSUE_NUMBER" =~ ^[0-9]+$ ]]; then
  echo "ERROR: Issue 番号は数値のみ (受領: $ISSUE_NUMBER)" >&2
  exit 1
fi

if ! [[ "$SLUG" =~ ^[a-z0-9-]+$ ]]; then
  echo "ERROR: slug は [a-z0-9-]+ のみ (受領: $SLUG)" >&2
  exit 1
fi

case "$TYPE" in
  feature|fix|chore) ;;
  *)
    echo "ERROR: --type は feature|fix|chore のいずれか (受領: $TYPE)" >&2
    exit 1
    ;;
esac

# ---- メインリポジトリの状態検証 ---------------------------------------------
cd "$REPO_ROOT"

CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [ "$CURRENT_BRANCH" = "master" ]; then
  if ! git diff --quiet || ! git diff --cached --quiet; then
    if [ "$FORCE_MAIN" -ne 1 ]; then
      cat <<EOF >&2
ERROR: メインリポジトリが master かつ未コミット変更ありです。

2 並列開発では「両 worktree が常に feature ブランチに居る」運用が前提です。
メイン側も先に feature ブランチへ移動するか、変更をコミット/stash してください。

それでも続行する場合は --force-main を付けて再実行してください。
EOF
      exit 1
    else
      echo "WARN: --force-main 指定により master + dirty 状態で続行します" >&2
    fi
  fi
fi

# ---- origin/master 最新化 ----------------------------------------------------
echo "==> git fetch origin"
git fetch origin --quiet

# ---- 既存 worktree 衝突チェック ---------------------------------------------
WT_PATH="${REPO_PARENT}/${REPO_NAME}-wt-${ISSUE_NUMBER}"

if git worktree list --porcelain | grep -qE "^worktree ${WT_PATH}$"; then
  echo "ERROR: Issue #${ISSUE_NUMBER} の worktree は既に存在します: ${WT_PATH}" >&2
  echo "既存を掃除するには: scripts/dev/teardown-worktree.sh ${ISSUE_NUMBER}" >&2
  exit 1
fi

BRANCH_NAME="${TYPE}/${ISSUE_NUMBER}-${SLUG}"

if git show-ref --verify --quiet "refs/heads/${BRANCH_NAME}"; then
  echo "ERROR: ブランチ '${BRANCH_NAME}' は既に存在します" >&2
  exit 1
fi

# ---- worktree 作成 -----------------------------------------------------------
echo "==> git worktree add ${WT_PATH} -b ${BRANCH_NAME} origin/master"
git worktree add "$WT_PATH" -b "$BRANCH_NAME" origin/master

# ---- pnpm install ------------------------------------------------------------
echo "==> pnpm install in ${WT_PATH}"
(
  cd "$WT_PATH"
  pnpm install
)

# ---- ポート計算 (既存 worktree 数 N に対し BASE + STEP*N) -----------------
WT_COUNT="$(git worktree list --porcelain | grep -cE '^worktree ')"
WT_INDEX="$((WT_COUNT - 1))"  # メインを除いた index (新規分が N 番目)
ADMIN_PORT="$((BASE_PORT_ADMIN + PORT_STEP * WT_INDEX))"
RESERVATION_PORT="$((BASE_PORT_RESERVATION + PORT_STEP * WT_INDEX))"

# ---- 完了サマリ --------------------------------------------------------------
cat <<EOF

============================================================
✅ worktree セットアップ完了

worktree:     ${WT_PATH}
branch:       ${BRANCH_NAME}
issue:        #${ISSUE_NUMBER}
worktree #:   ${WT_INDEX}

▼ 起動コマンド (cd ${WT_PATH} 後)
  pnpm --filter @high-q/admin dev --port ${ADMIN_PORT}
  pnpm --filter @high-q/reservation dev --port ${RESERVATION_PORT}

▼ アクセス先
  admin:        http://localhost:${ADMIN_PORT}
  reservation:  http://localhost:${RESERVATION_PORT}

▼ 次のステップ
  1. cd ${WT_PATH}
  2. このディレクトリで別の Claude セッションを起動
  3. 最新を取り込みたい時: git fetch origin && git merge origin/master

▼ 注意
  - master を直接 checkout しないこと (両 worktree で feature ブランチ常駐)
  - migration を含む change を 2 並列で走らせないこと (dev Supabase は 1 個)
  - 同一 OpenSpec capability の spec を 2 並列で編集しないこと
============================================================
EOF
