// lib/judge.mjs: what a check log must hold to pass.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LIB } from './helpers.mjs';

const dir = mkdtempSync(join(tmpdir(), 'judge-'));
const judge = (name, text) => {
  const file = join(dir, `${name}.log`);
  writeFileSync(file, text);
  const run = spawnSync('node', [LIB('judge.mjs'), file], { encoding: 'utf8' });
  return { code: run.status, out: run.stdout };
};

test('a clean run with one closing line passes', () => {
  const r = judge('ok', '[test] kit.a PASS\n[test] kit.b PASS\n[tests] done passed=2 failed=0\n');
  assert.equal(r.code, 0);
  assert.match(r.out, /\[judge\] PASS: 2 checks/);
});

test('a failed check fails', () => {
  const r = judge('fail', '[test] kit.a FAIL got 1, want 2\n[tests] done passed=0 failed=1\n');
  assert.equal(r.code, 1);
  assert.match(r.out, /1 check\(s\) failed/);
});

test('a run that never reaches the closing line fails', () => {
  const r = judge('crash', '[test] kit.a PASS\nSCRIPT ERROR: Parse Error: oops\n');
  assert.equal(r.code, 1);
  assert.match(r.out, /did not reach its closing/);
  assert.match(r.out, /engine error/);
});

test('two closing lines fail', () => {
  const r = judge('twice', '[tests] done passed=1 failed=0\n[tests] done passed=1 failed=0\n');
  assert.equal(r.code, 1);
  assert.match(r.out, /2 closing lines/);
});

test('an engine ERROR line fails even with a clean closing line', () => {
  const r = judge('engine', 'ERROR: Node not found\n[test] kit.a PASS\n[tests] done passed=1 failed=0\n');
  assert.equal(r.code, 1);
});

test('a missing log fails', () => {
  const run = spawnSync('node', [LIB('judge.mjs'), join(dir, 'nope.log')], { encoding: 'utf8' });
  assert.equal(run.status, 1);
});
