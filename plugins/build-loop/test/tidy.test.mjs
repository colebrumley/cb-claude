// lib/tidy.mjs without a remote: a worktree whose branch has landed on main is removed, one with
// work main does not have is kept. Runs in a throwaway repository.
import { spawnSync } from 'node:child_process';
import { utimesSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LIB, env, git, repo, worktree } from './helpers.mjs';

// the tree was "used" long ago: tidy keeps anything touched in the last half hour
const age = (dir, name) => {
  const old = new Date(Date.now() - 60 * 60 * 1000);
  utimesSync(join(dir, '.git', 'worktrees', name, 'logs', 'HEAD'), old, old);
};
const tidy = (dir, ...args) => spawnSync('node', [LIB('tidy.mjs'), ...args], { cwd: dir, env, encoding: 'utf8' });

test('a landed worktree is removed and an unlanded one is kept', () => {
  const dir = repo({});
  const landed = worktree(dir, 'landed');
  worktree(dir, 'pending');
  age(dir, 'landed');
  age(dir, 'pending');
  git(dir, 'merge', '--ff-only', '-q', 'landed');
  const run = tidy(dir);
  assert.equal(run.status, 0, run.stdout + run.stderr);
  assert.match(run.stdout, /remove worktree .*landed \(landed, merged\)/);
  assert.doesNotMatch(run.stdout, /remove worktree .*pending/);
  assert.match(run.stdout, /delete local branch landed/);
  const left = git(dir, 'worktree', 'list');
  assert.doesNotMatch(left, new RegExp(landed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(left, /pending/);
});

test('--dry-run changes nothing', () => {
  const dir = repo({});
  worktree(dir, 'landed');
  age(dir, 'landed');
  git(dir, 'merge', '--ff-only', '-q', 'landed');
  const run = tidy(dir, '--dry-run');
  assert.match(run.stdout, /would remove worktree/);
  assert.match(git(dir, 'worktree', 'list'), /landed/);
});

test('the base branch and worktree folder come from .build-loop.json', () => {
  const dir = repo({ base: 'trunk', worktrees: 'wt' });
  git(dir, 'branch', '-m', 'main', 'trunk');
  git(dir, 'worktree', 'add', '-q', join(dir, 'wt', 'done'), '-b', 'done', 'trunk');
  age(dir, 'done');
  const run = tidy(dir);
  assert.equal(run.status, 0, run.stdout + run.stderr);
  assert.match(run.stdout, /remove worktree .*wt\/done \(done, merged\)/);
});

test('a repository that has not opted in is refused', () => {
  const run = tidy(repo(null));
  assert.equal(run.status, 2);
  assert.match(run.stderr, /no \.build-loop\.json/);
});
