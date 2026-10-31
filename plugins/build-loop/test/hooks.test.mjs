// The plugin's hooks, fed the JSON Claude Code sends them, in throwaway repositories. The first rule
// they keep is that a repository without .build-loop.json never hears from them.
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LIB, decision, env, hook, repo, worktree } from './helpers.mjs';

const bash = (cwd, command) => hook('guard.mjs', { cwd, tool_input: { command } });
// the phrase is built from parts so that this file itself never holds a banned line
const banned = ['forbidden', 'phrase'].join(' ');
const config = { check: { command: 'scripts/check.sh', heavy: ['\\bmake\\s+test\\b'] }, words: { file: 'docs/AVOID.txt', exempt: ['docs/research/'] }, protect: [{ pattern: '^build/', reason: 'The checks write it.' }] };
const files = { 'docs/AVOID.txt': '# words\nforbidden\\s+phrase\n' };

test('guard lets everything through in a repository that has not opted in', () => {
  const dir = repo(null);
  assert.equal(bash(dir, 'git commit -m "x"').out, '');
  assert.equal(bash(dir, `git commit -m "${banned}"`).out, '');
});

test('guard refuses a commit and the gate from the main checkout, and follows cd', () => {
  const dir = repo(config, files);
  const r = bash(dir, 'git commit -m "x"');
  assert.equal(decision(r.out), 'deny');
  assert.match(JSON.parse(r.out).hookSpecificOutput.permissionDecisionReason, /main checkout.*\.claude\/worktrees/);
  assert.equal(decision(bash(dir, 'scripts/check.sh unit').out), 'deny');
  assert.equal(decision(bash(dir, 'build-loop check').out), 'deny');
  assert.equal(decision(bash(dir, 'make test').out), 'deny');
  assert.equal(decision(bash('/', `cd ${dir} && git add -A`).out), 'deny');
});

test('guard lets reads through in the main checkout', () => {
  const dir = repo(config, files);
  assert.equal(bash(dir, 'git status && ls && cat scripts/check.sh').out, '');
});

test('guard lets a commit through from a worktree, unless it matches the word list', () => {
  const dir = repo(config, files);
  const wt = worktree(dir, 'w1', false);
  assert.equal(bash(wt, 'git commit -m "fine"').out, '');
  const r = bash(wt, `git commit -m "add the ${banned}"`);
  assert.equal(decision(r.out), 'deny');
  assert.match(JSON.parse(r.out).hookSpecificOutput.permissionDecisionReason, /docs\/AVOID\.txt/);
});

test('guard scans new files but not the exempt ones', () => {
  const dir = repo(config, files);
  const wt = worktree(dir, 'w2', false);
  spawnSync('mkdir', ['-p', join(wt, 'docs', 'research')]);
  writeFileSync(join(wt, 'docs', 'research', 'notes.md'), `${banned}\n`);
  assert.equal(bash(wt, 'git commit -m "notes"').out, '');
  writeFileSync(join(wt, 'b.txt'), `${banned}\n`);
  assert.equal(decision(bash(wt, 'git commit -m "b"').out), 'deny');
});

test('build-loop words scans the branch', () => {
  const dir = repo(config, files);
  const wt = worktree(dir, 'w3');
  const run = spawnSync('node', [LIB('guard.mjs'), '--check'], { cwd: wt, env, encoding: 'utf8' });
  assert.equal(run.status, 0, run.stdout + run.stderr);
  assert.match(run.stdout, /nothing on this branch matches docs\/AVOID\.txt/);
});

test('protect refuses a listed path and lets others and other repositories through', () => {
  const dir = repo(config, files);
  assert.equal(decision(hook('protect.mjs', { cwd: dir, tool_input: { file_path: join(dir, 'build', 'last.log') } }).out), 'deny');
  assert.equal(hook('protect.mjs', { cwd: dir, tool_input: { file_path: join(dir, 'src', 'a.js') } }).out, '');
  const other = repo(null);
  assert.equal(hook('protect.mjs', { cwd: other, tool_input: { file_path: join(other, 'build', 'x') } }).out, '');
});

test('the board hook is silent where the loop is not set up, and prints the board where it is', () => {
  const quiet = spawnSync('node', [LIB('board.mjs'), '--hook'], { cwd: repo(null), env, encoding: 'utf8' });
  assert.equal(quiet.status, 0);
  assert.equal(quiet.stdout, '');
  const loud = spawnSync('node', [LIB('board.mjs'), '--hook'], { cwd: repo(config, files), env, encoding: 'utf8' });
  assert.match(loud.stdout, /Claims[\s\S]*Notes/);
});

test('hooks.json names every hook script', () => {
  const hooks = readFileSync(join(LIB('..'), 'hooks', 'hooks.json'), 'utf8');
  for (const s of ['lib/board.mjs\\" --hook', 'lib/guard.mjs', 'lib/protect.mjs']) assert.ok(hooks.includes(s), s);
});
