#!/usr/bin/env bash
# Worktree creation and cleanup helpers for bench runs.
# Sourced by run.sh — expects REPO_ROOT, RUN_ID, BENCH_DIR to be set.

create_worktree() {
  local name="$1"
  local branch="bench/${RUN_ID}/${name}"
  local path="${BENCH_DIR}/${name}"
  git -C "${REPO_ROOT}" worktree add -b "${branch}" "${path}" HEAD --quiet 2>/dev/null
  echo "${path}"
}

cleanup_all() {
  echo ""
  echo "=== Cleaning up ==="

  # Remove all bench worktrees
  local worktrees
  worktrees=$(git -C "${REPO_ROOT}" worktree list --porcelain 2>/dev/null \
    | grep "^worktree ${BENCH_DIR}" | sed 's/^worktree //')
  for wt in ${worktrees}; do
    echo "  Removing worktree: $(basename "${wt}")"
    git -C "${REPO_ROOT}" worktree remove "${wt}" --force 2>/dev/null || true
  done

  # Remove effort worktrees that were spawned inside bench worktrees
  local effort_wts
  effort_wts=$(git -C "${REPO_ROOT}" worktree list --porcelain 2>/dev/null \
    | grep "^worktree.*\.worktrees/effort-" | sed 's/^worktree //')
  for wt in ${effort_wts}; do
    echo "  Removing effort sub-worktree: $(basename "${wt}")"
    git -C "${REPO_ROOT}" worktree remove "${wt}" --force 2>/dev/null || true
  done

  # Remove bench branches
  local branches
  branches=$(git -C "${REPO_ROOT}" branch --list "bench/${RUN_ID}/*" 2>/dev/null)
  for branch in ${branches}; do
    git -C "${REPO_ROOT}" branch -D "${branch}" 2>/dev/null || true
  done

  # Remove effort branches created during this run
  local effort_branches
  effort_branches=$(git -C "${REPO_ROOT}" branch --list "effort/*" 2>/dev/null)
  for branch in ${effort_branches}; do
    git -C "${REPO_ROOT}" branch -D "${branch}" 2>/dev/null || true
  done

  # Remove bench directory
  rm -rf "${BENCH_DIR}" 2>/dev/null || true

  # Prune worktree metadata
  git -C "${REPO_ROOT}" worktree prune 2>/dev/null || true

  # Restore stash if we created one
  if [[ -n "${STASH_REF:-}" ]]; then
    local stash_index
    stash_index=$(git -C "${REPO_ROOT}" stash list \
      | grep "${STASH_REF}" | head -1 | sed 's/:.*//')
    if [[ -n "${stash_index}" ]]; then
      if git -C "${REPO_ROOT}" stash apply "${stash_index}" 2>/dev/null; then
        git -C "${REPO_ROOT}" stash drop "${stash_index}" 2>/dev/null || true
      else
        echo "  WARNING: Stash apply failed. Recover manually: git stash apply ${stash_index}"
      fi
    fi
  fi

  echo "=== Cleanup complete ==="
}
