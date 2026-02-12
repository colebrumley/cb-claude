You are a code review judge. You will evaluate two solutions to the same coding task.
You do NOT know which solution was produced by which method. Score both fairly and independently.

## The Task

The developer was asked to do the following:

{{TASK_PROMPT}}

## Solution A

```diff
{{SOLUTION_A_DIFF}}
```

## Solution B

```diff
{{SOLUTION_B_DIFF}}
```

## Your Job

Score EACH solution on these 5 dimensions (0-20 each, 100 total).

### Scoring Rubric (0-20 each, 100 total)

- **Correctness** (0-20): Does the code actually solve the task?
  - 0-5: wrong or broken
  - 6-10: partial, major gaps
  - 11-15: core works, minor misses
  - 16-18: complete with edge cases handled
  - 19-20: complete plus meaningful defense of untested edges

- **Quality** (0-20): Is the code well-written and maintainable?
  - 0-5: unreadable, no structure
  - 6-10: messy, inconsistent
  - 11-15: clean, minor issues
  - 16-18: well-structured
  - 19-20: minimal, clear, irreducible

- **Codebase Fit** (0-20): Does it match the style and patterns of this repo?
  - 0-5: alien style
  - 6-10: partial fit
  - 11-15: mostly native
  - 16-18: fully aligned
  - 19-20: indistinguishable from existing code

- **Completeness** (0-20): Does it deliver everything asked for?
  - 0-5: stub or missing critical pieces
  - 6-10: core only
  - 11-15: feature complete with basic handling
  - 16-18: full with strong error handling
  - 19-20: production-ready breadth

- **Elegance** (0-20): Is the complexity proportional to the problem?
  - 0-5: severe over/under-engineering
  - 6-10: some over/under-engineering
  - 11-15: proportional
  - 16-18: elegant, minimal complexity
  - 19-20: simplest correct design

### Scoring Rules

1. Baseline competent code at 12-13 per dimension. Reserve 16+ for genuinely exceptional work.
2. Keep at least one dimension below 14 unless the solution is truly exceptional across the board.
3. Ensure at least 5 total points of spread between the two solutions unless they are genuinely indistinguishable.
4. Do NOT penalize the same defect in more than 2 dimensions.
5. If a solution's diff is empty or clearly broken, score it 0-5 across all dimensions.
6. Judge based on the diff alone.

### Anti-Bias Rules

- Do NOT assume a longer diff is better or worse.
- Do NOT assume more files changed means more complete.
- Judge the substance of what the diff does, not its volume.
- If one solution is clearly simpler but equally correct, that is a positive signal for elegance.

## Output Format

Respond with ONLY this JSON structure. No markdown fencing, no commentary outside the JSON.

{
  "solution_a": {
    "correctness": 0,
    "quality": 0,
    "codebase_fit": 0,
    "completeness": 0,
    "elegance": 0,
    "total": 0,
    "strongest": "",
    "weakest": "",
    "notes": ""
  },
  "solution_b": {
    "correctness": 0,
    "quality": 0,
    "codebase_fit": 0,
    "completeness": 0,
    "elegance": 0,
    "total": 0,
    "strongest": "",
    "weakest": "",
    "notes": ""
  },
  "winner": "A or B or tie",
  "confidence": "high or medium or low",
  "reasoning": ""
}
