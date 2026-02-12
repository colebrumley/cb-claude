#!/usr/bin/env bash
# Score extraction and aggregation helpers for bench runs.
# Sourced by run.sh — expects RESULTS_DIR to be set.

# Extract and de-blind scores from judge output for a single task.
# Usage: extract_scores <task_dir>
extract_scores() {
  local task_dir="$1"

  # Read label mapping
  local opus_label effort_label
  opus_label=$(jq -r '.opus_label' "${task_dir}/label-map.json")
  effort_label=$(jq -r '.effort_label' "${task_dir}/label-map.json")

  # Extract the response text from claude JSON output
  local judge_text
  judge_text=$(jq -r '
    if .result then .result
    elif .content then
      [.content[] | select(.type == "text") | .text] | join("")
    elif type == "string" then .
    else tostring
    end
  ' "${task_dir}/judge-output.json" 2>/dev/null)

  # Try to parse as JSON directly, then try extracting from fences
  local parsed=""
  if echo "${judge_text}" | jq '.' > /dev/null 2>&1; then
    parsed="${judge_text}"
  else
    # Try extracting JSON from markdown fences or raw content
    parsed=$(echo "${judge_text}" | sed -n '/^{/,/^}/p' | head -100)
    if ! echo "${parsed}" | jq '.' > /dev/null 2>&1; then
      # Try between ```json fences
      parsed=$(echo "${judge_text}" | sed -n '/```json/,/```/{/```/d;p}' | head -100)
      if ! echo "${parsed}" | jq '.' > /dev/null 2>&1; then
        echo '{"error": "failed to parse judge output"}' > "${task_dir}/scores.json"
        echo "  WARNING: Could not parse judge output for $(basename "${task_dir}")"
        return 1
      fi
    fi
  fi

  echo "${parsed}" | jq '.' > "${task_dir}/judge-parsed.json"

  # De-blind: map solution_a/solution_b back to opus/effort
  local opus_key="solution_$(echo "${opus_label}" | tr 'A-Z' 'a-z')"
  local effort_key="solution_$(echo "${effort_label}" | tr 'A-Z' 'a-z')"

  jq --arg ok "${opus_key}" --arg ek "${effort_key}" \
     --arg ol "${opus_label}" --arg el "${effort_label}" '{
    opus: .[$ok],
    effort: .[$ek],
    opus_label: $ol,
    effort_label: $el,
    winner_label: .winner,
    winner_approach: (
      if .winner == $ol then "opus"
      elif .winner == $el then "effort"
      else "tie"
      end
    ),
    confidence: .confidence,
    reasoning: .reasoning
  }' "${task_dir}/judge-parsed.json" > "${task_dir}/scores-raw.json"

  # Enrich with cost and timing from run outputs
  local opus_cost opus_wall effort_cost effort_wall judge_cost
  opus_cost=$(jq -r '.cost_usd // .total_cost_usd // 0' "${task_dir}/opus-output.json" 2>/dev/null || echo 0)
  opus_wall=$(jq -r '.wall_seconds // 0' "${task_dir}/opus-meta.json" 2>/dev/null || echo 0)
  effort_cost=$(jq -r '.cost_usd // .total_cost_usd // 0' "${task_dir}/effort-output.json" 2>/dev/null || echo 0)
  effort_wall=$(jq -r '.wall_seconds // 0' "${task_dir}/effort-meta.json" 2>/dev/null || echo 0)
  judge_cost=$(jq -r '.cost_usd // .total_cost_usd // 0' "${task_dir}/judge-output.json" 2>/dev/null || echo 0)

  jq --argjson oc "${opus_cost:-0}" --argjson ow "${opus_wall:-0}" \
     --argjson ec "${effort_cost:-0}" --argjson ew "${effort_wall:-0}" \
     --argjson jc "${judge_cost:-0}" \
     '.opus_cost_usd = $oc | .effort_cost_usd = $ec |
      .opus_wall_seconds = $ow | .effort_wall_seconds = $ew |
      .judge_cost_usd = $jc' \
     "${task_dir}/scores-raw.json" > "${task_dir}/scores.json"
}

# Aggregate all task scores into a summary.
# Usage: aggregate_results <results_dir>
aggregate_results() {
  local results_dir="$1"
  local scores_files=()

  for f in "${results_dir}"/task-*/scores.json; do
    [[ -f "$f" ]] && scores_files+=("$f")
  done

  if [[ ${#scores_files[@]} -eq 0 ]]; then
    echo '{"error": "no scores found"}' > "${results_dir}/summary.json"
    return 1
  fi

  # Build summary with jq by reading all score files
  local task_results="[]"
  local opus_wins=0 effort_wins=0 ties=0
  local opus_score_sum=0 effort_score_sum=0
  local opus_cost_sum=0 effort_cost_sum=0
  local opus_wall_sum=0 effort_wall_sum=0
  local count=0

  for f in "${scores_files[@]}"; do
    local task_id
    task_id=$(basename "$(dirname "$f")" | sed 's/^task-//')

    local ot et w oc ec ow ew
    ot=$(jq '.opus.total // 0' "$f" 2>/dev/null || echo 0)
    et=$(jq '.effort.total // 0' "$f" 2>/dev/null || echo 0)
    w=$(jq -r '.winner_approach // "unknown"' "$f" 2>/dev/null || echo "unknown")
    oc=$(jq '.opus_cost_usd // 0' "$f" 2>/dev/null || echo 0)
    ec=$(jq '.effort_cost_usd // 0' "$f" 2>/dev/null || echo 0)
    ow=$(jq '.opus_wall_seconds // 0' "$f" 2>/dev/null || echo 0)
    ew=$(jq '.effort_wall_seconds // 0' "$f" 2>/dev/null || echo 0)

    task_results=$(echo "${task_results}" | jq --arg id "${task_id}" \
      --argjson ot "${ot}" --argjson et "${et}" --arg w "${w}" \
      --argjson oc "${oc}" --argjson ec "${ec}" \
      --argjson ow "${ow}" --argjson ew "${ew}" \
      '. + [{task_id: $id, opus_total: $ot, effort_total: $et, winner: $w, opus_cost: $oc, effort_cost: $ec, opus_wall: $ow, effort_wall: $ew}]')

    case "${w}" in
      opus) opus_wins=$((opus_wins + 1)) ;;
      effort) effort_wins=$((effort_wins + 1)) ;;
      *) ties=$((ties + 1)) ;;
    esac

    opus_score_sum=$(echo "${opus_score_sum} + ${ot}" | bc)
    effort_score_sum=$(echo "${effort_score_sum} + ${et}" | bc)
    opus_cost_sum=$(echo "${opus_cost_sum} + ${oc}" | bc)
    effort_cost_sum=$(echo "${effort_cost_sum} + ${ec}" | bc)
    opus_wall_sum=$(echo "${opus_wall_sum} + ${ow}" | bc)
    effort_wall_sum=$(echo "${effort_wall_sum} + ${ew}" | bc)
    count=$((count + 1))
  done

  local opus_avg effort_avg opus_wall_avg effort_wall_avg
  if [[ ${count} -gt 0 ]]; then
    opus_avg=$(echo "scale=1; ${opus_score_sum} / ${count}" | bc)
    effort_avg=$(echo "scale=1; ${effort_score_sum} / ${count}" | bc)
    opus_wall_avg=$(echo "scale=0; ${opus_wall_sum} / ${count}" | bc)
    effort_wall_avg=$(echo "scale=0; ${effort_wall_sum} / ${count}" | bc)
  else
    opus_avg=0; effort_avg=0; opus_wall_avg=0; effort_wall_avg=0
  fi

  jq -n \
    --arg run_id "${RUN_ID}" \
    --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    --argjson task_results "${task_results}" \
    --argjson opus_wins "${opus_wins}" \
    --argjson effort_wins "${effort_wins}" \
    --argjson ties "${ties}" \
    --argjson opus_avg "${opus_avg}" \
    --argjson effort_avg "${effort_avg}" \
    --argjson opus_total_cost "${opus_cost_sum}" \
    --argjson effort_total_cost "${effort_cost_sum}" \
    --argjson opus_avg_wall "${opus_wall_avg}" \
    --argjson effort_avg_wall "${effort_wall_avg}" \
    '{
      run_id: $run_id,
      timestamp: $timestamp,
      task_results: $task_results,
      totals: {
        opus_wins: $opus_wins,
        effort_wins: $effort_wins,
        ties: $ties,
        opus_avg_score: $opus_avg,
        effort_avg_score: $effort_avg,
        opus_total_cost: $opus_total_cost,
        effort_total_cost: $effort_total_cost,
        opus_avg_wall: $opus_avg_wall,
        effort_avg_wall: $effort_avg_wall
      }
    }' > "${results_dir}/summary.json"
}
