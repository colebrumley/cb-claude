// lib/queue.mjs: heavy runs wait for a slot; slots go to the oldest waiter; dead holders are reclaimed.
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LIB } from './helpers.mjs';

const fresh = () => mkdtempSync(join(tmpdir(), 'queue-'));
const runAll = async (count, slots, dir, seconds = 0.4) => {
  const started = Date.now();
  const children = Array.from({ length: count }, () =>
    spawn('node', [LIB('queue.mjs'), 'run', '--', 'sh', '-c', `sleep ${seconds}; echo ran`], { env: { ...process.env, QUEUE_DIR: dir, CHECK_SLOTS: String(slots) }, stdio: ['ignore', 'pipe', 'pipe'] }),
  );
  const codes = await Promise.all(children.map((c) => new Promise((done) => c.on('exit', done))));
  return { codes, seconds: (Date.now() - started) / 1000 };
};

test('one slot serialises three runs', async () => {
  const r = await runAll(3, 1, fresh());
  assert.deepEqual(r.codes, [0, 0, 0]);
  assert.ok(r.seconds >= 1.1, `took ${r.seconds}s, expected three sleeps in a row`);
});

test('three slots run three at once', async () => {
  const r = await runAll(3, 3, fresh());
  assert.deepEqual(r.codes, [0, 0, 0]);
  assert.ok(r.seconds < 1.1, `took ${r.seconds}s, expected them side by side`);
});

test('the command exit code comes back', async () => {
  const dir = fresh();
  const run = spawnSync('node', [LIB('queue.mjs'), 'run', '--', 'sh', '-c', 'exit 3'], { env: { ...process.env, QUEUE_DIR: dir, CHECK_SLOTS: '1' } });
  assert.equal(run.status, 3);
});

test('a slot whose holder is dead is reclaimed', async () => {
  const dir = fresh();
  mkdirSync(join(dir, 'slots', '0'), { recursive: true });
  writeFileSync(join(dir, 'slots', '0', 'holder.json'), JSON.stringify({ pid: 999999999, branch: 'ghost', at: 'x' }));
  const r = await runAll(1, 1, dir, 0.1);
  assert.deepEqual(r.codes, [0]);
  assert.ok(r.seconds < 2, `took ${r.seconds}s; the ghost's slot was not reclaimed`);
});

test('status names the slot count and who holds one', () => {
  const dir = fresh();
  const out = spawnSync('node', [LIB('queue.mjs'), 'status'], { env: { ...process.env, QUEUE_DIR: dir, CHECK_SLOTS: '2' }, encoding: 'utf8' }).stdout;
  assert.match(out, /Check slots: 2/);
  assert.match(out, /nobody is testing/);
});
