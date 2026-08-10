#!/usr/bin/env bash
set -euo pipefail

script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
fixture_root=$(mktemp -d)
worktree_path="${fixture_root}-worktree"
missing_env_path="${fixture_root}-missing-env-worktree"
cleanup() {
  rm -rf -- "$fixture_root"
  rm -rf -- "$worktree_path"
  rm -rf -- "$missing_env_path"
}
trap cleanup EXIT

git -C "$fixture_root" init -q -b main
git -C "$fixture_root" config user.email test@example.invalid
git -C "$fixture_root" config user.name 'Worktree Helper Test'
mkdir -p "$fixture_root/apps/web"
printf '%s\n' 'TEST_MARKER=fixture' > "$fixture_root/.env"
printf '%s\n' 'fixture' > "$fixture_root/apps/web/index.html"
git -C "$fixture_root" add .
git -C "$fixture_root" commit -qm 'fixture'

output=$(cd "$fixture_root" && "$script_dir/create-worktree.sh" test-branch "$worktree_path")

[[ -L "$worktree_path/apps/web/.env" ]]
[[ $(readlink "$worktree_path/apps/web/.env") == '../../.env' ]]
[[ $(git -C "$worktree_path" branch --show-current) == 'test-branch' ]]

if (cd "$fixture_root" && "$script_dir/create-worktree.sh" another-branch "$worktree_path") >/dev/null 2>&1; then
  printf '[test-create-worktree] Expected an existing path to be rejected.\n' >&2
  exit 1
fi

rm "$fixture_root/.env"
if (cd "$fixture_root" && "$script_dir/create-worktree.sh" missing-env "$missing_env_path") >/dev/null 2>&1; then
  printf '[test-create-worktree] Expected a missing root .env to be rejected.\n' >&2
  exit 1
fi
[[ ! -e "$missing_env_path" ]]

if [[ "$output" == *'TEST_MARKER'* ]]; then
  printf '[test-create-worktree] Output unexpectedly contained env content.\n' >&2
  exit 1
fi

printf '[test-create-worktree] PASS\n'
