#!/usr/bin/env bash
# Report generation for bench runs.
# Sourced by run.sh — expects RESULTS_DIR, RUN_ID, EFFORT_LEVEL, EFFORT_MODEL, OPUS_MODEL, JUDGE_MODEL.

generate_report() {
  local results_dir="$1"
  local summary="${results_dir}/summary.json"
  local report="${results_dir}/report.md"

  # Header
  cat > "${report}" <<EOF
# Bench Report: Effort+Sonnet vs One-Shot Opus

**Run**: ${RUN_ID}
**Date**: $(date -u +%Y-%m-%dT%H:%M:%SZ)
**Config**: Effort L${EFFORT_LEVEL} (${EFFORT_MODEL}) vs One-shot (${OPUS_MODEL}) | Judge: ${JUDGE_MODEL}

---

EOF

  # Summary table
  local opus_wins effort_wins ties opus_avg effort_avg
  local opus_cost effort_cost opus_wall effort_wall
  opus_wins=$(jq '.totals.opus_wins' "${summary}")
  effort_wins=$(jq '.totals.effort_wins' "${summary}")
  ties=$(jq '.totals.ties' "${summary}")
  opus_avg=$(jq '.totals.opus_avg_score' "${summary}")
  effort_avg=$(jq '.totals.effort_avg_score' "${summary}")
  opus_cost=$(jq '.totals.opus_total_cost' "${summary}")
  effort_cost=$(jq '.totals.effort_total_cost' "${summary}")
  opus_wall=$(jq '.totals.opus_avg_wall' "${summary}")
  effort_wall=$(jq '.totals.effort_avg_wall' "${summary}")

  cat >> "${report}" <<EOF
## Summary

| Metric | One-Shot Opus | Effort + ${EFFORT_MODEL^} |
|--------|:------------:|:------------------------:|
| Wins | ${opus_wins} | ${effort_wins} |
| Ties | ${ties} | ${ties} |
| Avg Score | ${opus_avg}/100 | ${effort_avg}/100 |
| Total Cost | \$${opus_cost} | \$${effort_cost} |
| Avg Wall Time | ${opus_wall}s | ${effort_wall}s |

EOF

  # Per-task breakdown
  cat >> "${report}" <<'EOF'
## Per-Task Breakdown

| Task | Opus | Effort | Winner | Opus Cost | Effort Cost | Opus Time | Effort Time |
|------|:----:|:------:|:------:|:---------:|:-----------:|:---------:|:-----------:|
EOF

  for scores_file in "${results_dir}"/task-*/scores.json; do
    [[ -f "${scores_file}" ]] || continue
    local task_id
    task_id=$(basename "$(dirname "${scores_file}")" | sed 's/^task-//')
    local ot et w oc ec ow ew
    ot=$(jq '.opus.total // "-"' "${scores_file}")
    et=$(jq '.effort.total // "-"' "${scores_file}")
    w=$(jq -r '.winner_approach // "?"' "${scores_file}")
    oc=$(jq '.opus_cost_usd // 0' "${scores_file}")
    ec=$(jq '.effort_cost_usd // 0' "${scores_file}")
    ow=$(jq '.opus_wall_seconds // 0' "${scores_file}")
    ew=$(jq '.effort_wall_seconds // 0' "${scores_file}")
    echo "| ${task_id} | ${ot}/100 | ${et}/100 | **${w}** | \$${oc} | \$${ec} | ${ow}s | ${ew}s |" >> "${report}"
  done

  echo "" >> "${report}"

  # Dimension averages
  cat >> "${report}" <<'EOF'
## Dimension Averages

| Dimension | Opus Avg | Effort Avg | Delta |
|-----------|:--------:|:----------:|:-----:|
EOF

  for dim in correctness quality codebase_fit completeness elegance; do
    local opus_dim=0 effort_dim=0 count=0
    for scores_file in "${results_dir}"/task-*/scores.json; do
      [[ -f "${scores_file}" ]] || continue
      local od ed
      od=$(jq ".opus.${dim} // 0" "${scores_file}" 2>/dev/null || echo 0)
      ed=$(jq ".effort.${dim} // 0" "${scores_file}" 2>/dev/null || echo 0)
      opus_dim=$(echo "${opus_dim} + ${od}" | bc)
      effort_dim=$(echo "${effort_dim} + ${ed}" | bc)
      count=$((count + 1))
    done
    if [[ ${count} -gt 0 ]]; then
      local oa ea delta
      oa=$(echo "scale=1; ${opus_dim} / ${count}" | bc)
      ea=$(echo "scale=1; ${effort_dim} / ${count}" | bc)
      delta=$(echo "scale=1; ${ea} - ${oa}" | bc)
      local sign=""
      [[ "${delta}" != -* ]] && sign="+"
      echo "| ${dim} | ${oa}/20 | ${ea}/20 | ${sign}${delta} |" >> "${report}"
    fi
  done

  echo "" >> "${report}"

  # Cost efficiency
  cat >> "${report}" <<EOF
## Cost Efficiency

EOF

  local total_cost
  total_cost=$(echo "${opus_cost} + ${effort_cost}" | bc 2>/dev/null || echo "?")
  echo "- **Total benchmark cost**: \$${total_cost}" >> "${report}"

  if [[ "${opus_cost}" != "0" ]] && [[ "${opus_cost}" != "null" ]]; then
    local ratio
    ratio=$(echo "scale=1; ${effort_cost} / ${opus_cost}" | bc 2>/dev/null || echo "?")
    echo "- **Cost ratio** (effort/opus): ${ratio}x" >> "${report}"
    local opus_ppd effort_ppd
    opus_ppd=$(echo "scale=1; ${opus_avg} / ${opus_cost}" | bc 2>/dev/null || echo "?")
    effort_ppd=$(echo "scale=1; ${effort_avg} / ${effort_cost}" | bc 2>/dev/null || echo "?")
    echo "- **Score-per-dollar** (opus): ${opus_ppd} pts/\$" >> "${report}"
    echo "- **Score-per-dollar** (effort): ${effort_ppd} pts/\$" >> "${report}"
  fi

  echo "" >> "${report}"

  # Judge reasoning
  cat >> "${report}" <<'EOF'
## Judge Notes

EOF

  for scores_file in "${results_dir}"/task-*/scores.json; do
    [[ -f "${scores_file}" ]] || continue
    local task_id reasoning confidence
    task_id=$(basename "$(dirname "${scores_file}")" | sed 's/^task-//')
    reasoning=$(jq -r '.reasoning // "No reasoning provided"' "${scores_file}")
    confidence=$(jq -r '.confidence // "unknown"' "${scores_file}")
    echo "### ${task_id} (confidence: ${confidence})" >> "${report}"
    echo "" >> "${report}"
    echo "${reasoning}" >> "${report}"
    echo "" >> "${report}"
  done
}
