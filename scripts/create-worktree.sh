#!/usr/bin/env bash
set -euo pipefail

usage() {
  printf 'Usage: %s <new-branch> <worktree-path> [base-ref]\n' "$(basename "$0")" >&2
  printf 'Creates a Git worktree with apps/web/.env linked to the repository .env.\n' >&2
}

if [[ $# -lt 2 || $# -gt 3 ]]; then
  usage
  exit 64
fi

branch=$1
worktree_path=$2
base_ref=${3:-HEAD}
repo_root=$(git rev-parse --show-toplevel 2>/dev/null) || {
  printf '[create-worktree] Error: run this helper from inside a Git repository.\n' >&2
  exit 1
}

root_env="$repo_root/.env"
if [[ ! -f "$root_env" ]]; then
  printf '[create-worktree] Error: %s is missing. Create the local env file before continuing.\n' "$root_env" >&2
  exit 1
fi

if [[ -e "$worktree_path" || -L "$worktree_path" ]]; then
  printf '[create-worktree] Error: worktree path already exists: %s\n' "$worktree_path" >&2
  printf '[create-worktree] Refusing to overwrite it. Choose another path or remove it intentionally first.\n' >&2
  exit 1
fi

worktree_parent=$(dirname -- "$worktree_path")
mkdir -p -- "$worktree_parent"

printf '[create-worktree] Creating worktree for branch "%s" at %s\n' "$branch" "$worktree_path"
git -C "$repo_root" worktree add -b "$branch" "$worktree_path" "$base_ref"

web_env="$worktree_path/apps/web/.env"
if [[ -e "$web_env" || -L "$web_env" ]]; then
  printf '[create-worktree] Error: %s already exists; refusing to replace it.\n' "$web_env" >&2
  printf '[create-worktree] The worktree was created, but its env link was not changed.\n' >&2
  exit 1
fi

ln -s '../../.env' "$web_env"
printf '[create-worktree] Linked apps/web/.env to ../../.env (secrets were not copied or displayed).\n'
printf '[create-worktree] Ready for visual testing.\n'
