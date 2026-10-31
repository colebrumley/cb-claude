// The commands a worker runs: the board, the gate, the docs check and landing, through bin/build-loop.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cli, git, repo, worktree } from './helpers.mjs';

const item = (id, extra = '') => `- [ ] **${id} A thing**\n  It does the thing.\n  **Depends on:** nothing.\n  **Verify:** \`build-loop check\`.\n${extra}`;
const backlog = (...items) => `# Backlog\n\n## Phase 1 — start\n\n${items.join('\n')}\n`;
const spec = (body = {}) => `# Thing: spec for R-2

Written by \`/plan\` on 2026-10-30. Status: proposed.

## Goal

It works.

## Non-goals

Nothing else.

## Shared surfaces

None.

## Work items

### W1 — the thing (R-2, size S, depends on: nothing)

Files: \`a.txt\`

Acceptance:
${body.acceptance ?? '- it does the thing'}

${body.verify ?? 'Verify: `build-loop check`.'}

## Open questions and decisions

${body.questions ?? '- Q: which way? Default: the smaller one.'}
`;
const setup = (files = {}, config = {}) => repo({ check: { command: 'sh scripts/check.sh', light: ['lint'] }, ...config }, { 'REQUIREMENTS.md': backlog(item('R-1')), 'scripts/check.sh': 'echo "stage=${1:-all}"; [ "${1:-}" != broken ]\n', ...files });

test('docs passes a well-formed backlog and spec', () => {
  const dir = setup({ 'REQUIREMENTS.md': backlog(item('R-1'), '- [ ] **R-2 Thing** — docs/specs/thing.md, item W1, size S.'), 'docs/specs/thing.md': spec() });
  const r = cli(dir, 'docs');
  assert.equal(r.code, 0, r.out + r.err);
  assert.match(r.out, /ok: 2 items, 1 specs/);
});

test('docs fails a duplicate ID, a missing Verify line and a missing spec', () => {
  const dir = setup({ 'REQUIREMENTS.md': backlog(item('R-1'), item('R-1'), '- [ ] **R-3 B**\n  text\n  **Depends on:** nothing.\n', '- [ ] **R-4 C** — docs/specs/nope.md, item W1, size S.') });
  const r = cli(dir, 'docs');
  assert.equal(r.code, 1);
  assert.match(r.out, /R-1: already defined/);
  assert.match(r.out, /R-3: no \*\*Verify:\*\* line/);
  assert.match(r.out, /nope\.md does not exist/);
});

test('docs fails a blocked item with no reason, and passes one with a reason', () => {
  assert.match(cli(setup({ 'REQUIREMENTS.md': backlog('- [!] **R-1 A**\n  **Depends on:** nothing.\n  **Verify:** x.') }), 'docs').out, /blocked without a reason/);
  assert.equal(cli(setup({ 'REQUIREMENTS.md': backlog('- [!] **R-1 A** the API is down\n  **Depends on:** nothing.\n  **Verify:** x.') }), 'docs').code, 0);
});

test('docs uses the configured ID prefix', () => {
  const r = cli(setup({ 'REQUIREMENTS.md': backlog(item('APP-1'), item('APP-1')) }, { idPrefix: 'APP' }), 'docs');
  assert.match(r.out, /APP-1: already defined/);
});

test('docs fails a spec with template text, no acceptance bullet, no Verify line, or a question with no default', () => {
  const cases = [
    [{ acceptance: '- ...' }, /template text left in/],
    [{ acceptance: '' }, /W1: no acceptance bullet/],
    [{ verify: '' }, /W1: no Verify: line/],
    [{ questions: '- Q: which way?' }, /no "Default:"/],
  ];
  for (const [body, want] of cases) {
    const r = cli(setup({ 'docs/specs/thing.md': spec(body) }), 'docs');
    assert.equal(r.code, 1, JSON.stringify(body));
    assert.match(r.out, want);
  }
});

test('docs fails a spec missing a section, and a missing required doc', () => {
  const r = cli(setup({ 'docs/specs/thing.md': spec().replace('## Non-goals\n', '') }, { requiredDocs: ['docs/ARCHITECTURE.md'] }), 'docs');
  assert.match(r.out, /no "## Non-goals" section/);
  assert.match(r.out, /docs\/ARCHITECTURE\.md is missing/);
});

test('check runs docs, then the project gate with the stage, and stops at a failure', () => {
  const dir = setup();
  const wt = worktree(dir, 'w1');
  const all = cli(wt, 'check');
  assert.equal(all.code, 0, all.out + all.err);
  assert.match(all.out, /\[check\] docs PASS[\s\S]*stage=all[\s\S]*\[check\] gate PASS[\s\S]*\[check\] done PASS/);
  const one = cli(wt, 'check', 'lint');
  assert.match(one.out, /stage=lint/);
  assert.doesNotMatch(one.out, /docs PASS/);
  const bad = cli(wt, 'check', 'broken');
  assert.equal(bad.code, 1);
  assert.match(bad.out, /\[check\] done FAIL at broken/);
});

test('land fast-forwards main to a worktree that contains it, and refuses one that does not', () => {
  const dir = setup();
  const wt = worktree(dir, 'w1');
  const r = cli(wt, 'land');
  assert.equal(r.code, 0, r.out + r.err);
  assert.equal(git(dir, 'rev-parse', 'main'), git(wt, 'rev-parse', 'HEAD'));
  const behind = worktree(dir, 'w2');
  writeFileSync(join(dir, 'b.txt'), 'b\n');
  git(dir, 'add', 'b.txt');
  git(dir, 'commit', '-q', '-m', 'b');
  const refused = cli(behind, 'land');
  assert.equal(refused.code, 1);
  assert.match(refused.err, /main has commits this branch does not/);
});

test('the board: a claim from a worktree holds against another, and release frees it', () => {
  const dir = setup();
  const a = worktree(dir, 'a', false);
  const b = worktree(dir, 'b', false);
  assert.equal(cli(dir, 'board', 'claim', 'R-1', 'x').code, 1);
  assert.equal(cli(a, 'board', 'claim', 'R-1', 'the thing').code, 0);
  const taken = cli(b, 'board', 'claim', 'R-1');
  assert.equal(taken.code, 1);
  assert.match(taken.err, /taken by a/);
  assert.equal(cli(a, 'board', 'release', 'R-1').code, 0);
  assert.equal(cli(b, 'board', 'claim', 'R-1').code, 0);
  assert.match(cli(dir, 'board').out, /R-1\s+b/);
});

test('an unknown command is refused', () => {
  assert.equal(cli(setup(), 'nope').code, 2);
});
