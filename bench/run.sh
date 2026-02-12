#!/usr/bin/env bash
set -euo pipefail

# ── Bench: Effort vs One-Shot Comparison Pipeline ─────────────────────────
# Runs predefined coding tasks through both /effort (multi-agent) and
# one-shot opus, then blind-scores both outputs with the same rubric.
#
# Usage:
#   bench/run.sh                      # Run all tasks
#   bench/run.sh <task-id>            # Run a single task
#   EFFORT_MODEL=haiku bench/run.sh   # Override effort model

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(git -C "${SCRIPT_DIR}" rev-parse --show-toplevel)"
TASKS_FILE="${SCRIPT_DIR}/tasks.json"
JUDGE_TEMPLATE="${SCRIPT_DIR}/judge-prompt.md"
RUN_ID="$(date +%Y%m%d-%H%M%S)-$$"
RESULTS_DIR="${SCRIPT_DIR}/results/${RUN_ID}"
BENCH_DIR="${REPO_ROOT}/.worktrees/bench-${RUN_ID}"
STASH_REF=""

# Configurable via env vars or tasks.json defaults
EFFORT_LEVEL="${EFFORT_LEVEL:-$(jq -r '.defaults.effort_level // 1' "${TASKS_FILE}")}"
EFFORT_MODEL="${EFFORT_MODEL:-$(jq -r '.defaults.effort_model // "sonnet"' "${TASKS_FILE}")}"
OPUS_MODEL="${OPUS_MODEL:-$(jq -r '.defaults.opus_model // "opus"' "${TASKS_FILE}")}"
JUDGE_MODEL="${JUDGE_MODEL:-$(jq -r '.defaults.judge_model // "opus"' "${TASKS_FILE}")}"
TIMEOUT="${TIMEOUT:-$(jq -r '.defaults.timeout_seconds // 600' "${TASKS_FILE}")}"
TASK_FILTER="${1:-}"

# Source helpers
source "${SCRIPT_DIR}/lib/worktree.sh"
source "${SCRIPT_DIR}/lib/scoring.sh"
source "${SCRIPT_DIR}/lib/report.sh"

# ── Pre-flight ────────────────────────────────────────────────────────────

preflight() {
  local missing=""
  command -v claude >/dev/null 2>&1 || missing+=" claude"
  command -v jq >/dev/null 2>&1    || missing+=" jq"
  command -v git >/dev/null 2>&1   || missing+=" git"
  command -v bc >/dev/null 2>&1    || missing+=" bc"

  if [[ -n "${missing}" ]]; then
    echo "ERROR: Missing required tools:${missing}" >&2
    exit 1
  fi

  [[ -f "${TASKS_FILE}" ]]    || { echo "ERROR: ${TASKS_FILE} not found" >&2; exit 1; }
  [[ -f "${JUDGE_TEMPLATE}" ]] || { echo "ERROR: ${JUDGE_TEMPLATE} not found" >&2; exit 1; }

  # Stash dirty working tree
  if [[ -n "$(git -C "${REPO_ROOT}" status --porcelain 2>/dev/null)" ]]; then
    echo "Working tree has uncommitted changes — stashing."
    STASH_REF="bench-auto-stash-${RUN_ID}"
    git -C "${REPO_ROOT}" stash push -m "${STASH_REF}" --quiet
  fi
}

# ── Run one-shot opus ─────────────────────────────────────────────────────

run_opus() {
  local task_id="$1" prompt="$2" task_dir="$3"
  local wt_path
  wt_path=$(create_worktree "opus-${task_id}")

  local start_time end_time
  start_time=$(date +%s)

  (
    cd "${wt_path}"
    claude -p \
      --model "${OPUS_MODEL}" \
      --output-format json \
      --dangerously-skip-permissions \
      "Implement the following task in this codebase. Make all necessary code changes and commit your work with a descriptive message.

Task: ${prompt}" \
      < /dev/null
  ) > "${task_dir}/opus-output.json" 2>"${task_dir}/opus-stderr.log" || true

  end_time=$(date +%s)
  jq -n --argjson wall "$((end_time - start_time))" '{wall_seconds: $wall}' \
    > "${task_dir}/opus-meta.json"

  # Extract diff
  local base_sha
  base_sha=$(git -C "${wt_path}" merge-base HEAD "$(git -C "${REPO_ROOT}" rev-parse HEAD)" 2>/dev/null || echo "HEAD~1")
  git -C "${wt_path}" diff "${base_sha}..HEAD" > "${task_dir}/opus.patch" 2>/dev/null || true
  git -C "${wt_path}" diff --stat "${base_sha}..HEAD" > "${task_dir}/opus.stats" 2>/dev/null || true
}

# ── Run effort with sonnet ────────────────────────────────────────────────

run_effort() {
  local task_id="$1" prompt="$2" task_dir="$3"
  local wt_path
  wt_path=$(create_worktree "effort-${task_id}")

  local start_time end_time
  start_time=$(date +%s)

  (
    cd "${wt_path}"
    claude -p \
      --model "${EFFORT_MODEL}" \
      --output-format json \
      --dangerously-skip-permissions \
      "/effort --model ${EFFORT_MODEL} --instructions none --level ${EFFORT_LEVEL} ${prompt}" \
      < /dev/null
  ) > "${task_dir}/effort-output.json" 2>"${task_dir}/effort-stderr.log" || true

  end_time=$(date +%s)
  jq -n --argjson wall "$((end_time - start_time))" '{wall_seconds: $wall}' \
    > "${task_dir}/effort-meta.json"

  # Extract diff — effort merges to current branch so diff against base
  local base_sha
  base_sha=$(git -C "${wt_path}" merge-base HEAD "$(git -C "${REPO_ROOT}" rev-parse HEAD)" 2>/dev/null || echo "HEAD~1")
  git -C "${wt_path}" diff "${base_sha}..HEAD" > "${task_dir}/effort.patch" 2>/dev/null || true
  git -C "${wt_path}" diff --stat "${base_sha}..HEAD" > "${task_dir}/effort.stats" 2>/dev/null || true
}

# ── Blind judge ───────────────────────────────────────────────────────────

run_judge() {
  local task_id="$1" task_prompt="$2" task_dir="$3"

  # Randomly assign A/B labels
  local label_opus label_effort
  if (( RANDOM % 2 )); then
    label_opus="A"; label_effort="B"
  else
    label_opus="B"; label_effort="A"
  fi

  jq -n --arg a "${label_opus}" --arg b "${label_effort}" \
    '{opus_label: $a, effort_label: $b}' > "${task_dir}/label-map.json"

  # Build judge input by substituting into template
  local judge_input="${task_dir}/judge-input.md"
  local solution_a_file solution_b_file
  if [[ "${label_opus}" == "A" ]]; then
    solution_a_file="${task_dir}/opus.patch"
    solution_b_file="${task_dir}/effort.patch"
  else
    solution_a_file="${task_dir}/effort.patch"
    solution_b_file="${task_dir}/opus.patch"
  fi

  # Read template and substitute placeholders
  local template
  template=$(<"${JUDGE_TEMPLATE}")

  # Replace task prompt
  local escaped_prompt
  escaped_prompt=$(printf '%s' "${task_prompt}" | sed 's/[&/\]/\\&/g')
  template="${template//\{\{TASK_PROMPT\}\}/${task_prompt}}"

  # Replace solution diffs using temp files to handle large diffs
  local solution_a_diff solution_b_diff
  solution_a_diff=$(<"${solution_a_file}" 2>/dev/null || echo "(empty diff — no changes produced)")
  solution_b_diff=$(<"${solution_b_file}" 2>/dev/null || echo "(empty diff — no changes produced)")

  # Write the assembled prompt
  {
    echo "${template}" | sed '/{{SOLUTION_A_DIFF}}/,/{{SOLUTION_A_DIFF}}/d; /{{SOLUTION_B_DIFF}}/,/{{SOLUTION_B_DIFF}}/d'
  } > "${judge_input}.tmp" || true

  # Simpler approach: use awk to replace placeholders
  awk -v a_file="${solution_a_file}" -v b_file="${solution_b_file}" '
    /\{\{SOLUTION_A_DIFF\}\}/ {
      while ((getline line < a_file) > 0) print line
      close(a_file)
      next
    }
    /\{\{SOLUTION_B_DIFF\}\}/ {
      while ((getline line < b_file) > 0) print line
      close(b_file)
      next
    }
    /\{\{TASK_PROMPT\}\}/ {
      gsub(/\{\{TASK_PROMPT\}\}/, task_prompt)
    }
    { print }
  ' task_prompt="${task_prompt}" "${JUDGE_TEMPLATE}" > "${judge_input}"

  # Run judge
  claude -p \
    --model "${JUDGE_MODEL}" \
    --output-format json \
    --dangerously-skip-permissions \
    "$(cat "${judge_input}")" \
    < /dev/null \
    > "${task_dir}/judge-output.json" 2>"${task_dir}/judge-stderr.log" || true
}

# ── Main ──────────────────────────────────────────────────────────────────

main() {
  preflight
  trap cleanup_all EXIT

  mkdir -p "${RESULTS_DIR}" "${BENCH_DIR}"

  local task_count
  task_count=$(jq '.tasks | length' "${TASKS_FILE}")

  echo "============================================="
  echo "  Bench Run: ${RUN_ID}"
  echo "  Tasks: ${task_count} | Effort: L${EFFORT_LEVEL} (${EFFORT_MODEL}) | One-shot: ${OPUS_MODEL} | Judge: ${JUDGE_MODEL}"
  echo "============================================="
  echo ""

  local task_index=0
  local completed=0 failed=0

  while [[ ${task_index} -lt ${task_count} ]]; do
    local task_id task_name task_prompt
    task_id=$(jq -r ".tasks[${task_index}].id" "${TASKS_FILE}")
    task_name=$(jq -r ".tasks[${task_index}].name" "${TASKS_FILE}")
    task_prompt=$(jq -r ".tasks[${task_index}].prompt" "${TASKS_FILE}")

    # Apply filter if specified
    if [[ -n "${TASK_FILTER}" && "${task_id}" != "${TASK_FILTER}" ]]; then
      task_index=$((task_index + 1))
      continue
    fi

    echo "── Task $((task_index + 1))/${task_count}: ${task_name} (${task_id}) ──"
    local task_dir="${RESULTS_DIR}/task-${task_id}"
    mkdir -p "${task_dir}"

    # Phase 1: Run both approaches in parallel
    echo "  Running one-shot opus..."
    run_opus "${task_id}" "${task_prompt}" "${task_dir}" &
    local opus_pid=$!

    echo "  Running effort + ${EFFORT_MODEL}..."
    run_effort "${task_id}" "${task_prompt}" "${task_dir}" &
    local effort_pid=$!

    # Wait for both
    local opus_exit=0 effort_exit=0
    wait ${opus_pid} 2>/dev/null || opus_exit=$?
    wait ${effort_pid} 2>/dev/null || effort_exit=$?

    echo "  Opus exit: ${opus_exit} | Effort exit: ${effort_exit}"

    # Phase 2: Check diffs exist
    local opus_patch_size effort_patch_size
    opus_patch_size=$(wc -c < "${task_dir}/opus.patch" 2>/dev/null || echo 0)
    effort_patch_size=$(wc -c < "${task_dir}/effort.patch" 2>/dev/null || echo 0)
    echo "  Opus diff: ${opus_patch_size} bytes | Effort diff: ${effort_patch_size} bytes"

    # Phase 3: Blind judge
    echo "  Running blind judge..."
    run_judge "${task_id}" "${task_prompt}" "${task_dir}"

    # Phase 4: Extract scores
    if extract_scores "${task_dir}"; then
      local opus_total effort_total winner
      opus_total=$(jq '.opus.total // "?"' "${task_dir}/scores.json")
      effort_total=$(jq '.effort.total // "?"' "${task_dir}/scores.json")
      winner=$(jq -r '.winner_approach // "?"' "${task_dir}/scores.json")
      echo "  Scores: Opus ${opus_total}/100 | Effort ${effort_total}/100 | Winner: ${winner}"
      completed=$((completed + 1))
    else
      echo "  WARNING: Scoring failed for this task"
      failed=$((failed + 1))
    fi

    echo ""
    task_index=$((task_index + 1))
  done

  # Phase 5: Aggregate and report
  echo "── Generating report ──"
  aggregate_results "${RESULTS_DIR}"
  generate_report "${RESULTS_DIR}"

  echo ""
  echo "============================================="
  echo "  Complete: ${completed} scored, ${failed} failed"
  echo "  Report: ${RESULTS_DIR}/report.md"
  echo "  Summary: ${RESULTS_DIR}/summary.json"
  echo "============================================="

  # Print quick summary
  if [[ -f "${RESULTS_DIR}/summary.json" ]]; then
    echo ""
    local ow ew oa ea
    ow=$(jq '.totals.opus_wins' "${RESULTS_DIR}/summary.json")
    ew=$(jq '.totals.effort_wins' "${RESULTS_DIR}/summary.json")
    oa=$(jq '.totals.opus_avg_score' "${RESULTS_DIR}/summary.json")
    ea=$(jq '.totals.effort_avg_score' "${RESULTS_DIR}/summary.json")
    echo "  Opus wins: ${ow} | Effort wins: ${ew}"
    echo "  Opus avg: ${oa}/100 | Effort avg: ${ea}/100"
  fi
}

main "$@"
