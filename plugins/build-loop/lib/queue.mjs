// The check queue: how many heavy runs the machine does at once. Every heavy stage of
// `build-loop check` runs through it, so any number of workers can build at the same time while only
// a few of them test at the same time. A slot is a directory under the repository's shared git
// directory (common to every worktree, never committed) holding the pid that owns it; a ticket is
// a file that says "I am waiting", so slots go to the oldest waiter first. A slot or ticket whose
// process is gone is reclaimed. The number of slots is CHECK_SLOTS, else the file slots.txt beside
// the queue, else a quarter of the machine's cores (at least one).
//   build-loop queue run -- <command...>   wait for a slot, run the command with it, release it
//   build-loop queue status                who holds a slot, who is waiting
//   build-loop queue slots <n>             set the slot count for this machine (the owner's call)
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { cpus } from 'node:os';
import { join, resolve } from 'node:path';

const git = (...args) => {
  try {
    return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
};
const dir = process.env['QUEUE_DIR'] ?? join(resolve(git('rev-parse', '--git-common-dir') || '.git'), 'queue');
const slotsDir = join(dir, 'slots');
const ticketsDir = join(dir, 'tickets');
mkdirSync(slotsDir, { recursive: true });
mkdirSync(ticketsDir, { recursive: true });

const slotCount = () => {
  const env = Number(process.env['CHECK_SLOTS']);
  if (env > 0) return env;
  try {
    const file = Number(readFileSync(join(dir, 'slots.txt'), 'utf8'));
    if (file > 0) return file;
  } catch {
    // no file: the default
  }
  return Math.max(1, Math.floor(cpus().length / 4));
};
const alive = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return e.code === 'EPERM';
  }
};
const readJson = (file) => {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
};
const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
const me = { pid: process.pid, branch: git('branch', '--show-current') || 'detached', cwd: process.cwd(), at: new Date().toISOString() };

/** Slot holders and waiters that are still running; the rest are reclaimed as they are read. */
function state() {
  const holders = [];
  for (const name of readdirSync(slotsDir)) {
    const info = readJson(join(slotsDir, name, 'holder.json'));
    if (info && alive(info.pid)) holders.push({ slot: name, ...info });
    else rmSync(join(slotsDir, name), { recursive: true, force: true });
  }
  const waiters = [];
  for (const name of readdirSync(ticketsDir).sort()) {
    const info = readJson(join(ticketsDir, name));
    if (info && alive(info.pid)) waiters.push({ ticket: name, ...info });
    else rmSync(join(ticketsDir, name), { force: true });
  }
  return { holders, waiters };
}

function acquire() {
  const ticket = `${Date.now().toString().padStart(14, '0')}-${process.pid}`;
  writeFileSync(join(ticketsDir, ticket), JSON.stringify(me));
  let said = '';
  for (;;) {
    const { holders, waiters } = state();
    const position = waiters.findIndex((w) => w.ticket === ticket);
    const free = slotCount() - holders.length;
    if (position >= 0 && position < free) {
      for (let i = 0; i < slotCount(); i++) {
        const slot = join(slotsDir, String(i));
        try {
          mkdirSync(slot);
        } catch {
          continue;
        }
        writeFileSync(join(slot, 'holder.json'), JSON.stringify(me));
        rmSync(join(ticketsDir, ticket), { force: true });
        return slot;
      }
    }
    const line = `queue: waiting for a check slot (position ${position + 1} of ${waiters.length}; ${holders.length} of ${slotCount()} held${holders.length ? ` by ${holders.map((h) => h.branch).join(', ')}` : ''})`;
    if (line !== said) {
      console.error(line);
      said = line;
    }
    sleep(500);
  }
}

const [command = 'status', ...rest] = process.argv.slice(2);
if (command === 'status') {
  const { holders, waiters } = state();
  console.log(`Check slots: ${slotCount()} (CHECK_SLOTS, ${join(dir, 'slots.txt')}, or a quarter of ${cpus().length} cores)`);
  for (const h of holders) console.log(`  held    ${h.branch} (pid ${h.pid}) since ${h.at}`);
  for (const w of waiters) console.log(`  waiting ${w.branch} (pid ${w.pid}) since ${w.at}`);
  if (holders.length === 0 && waiters.length === 0) console.log('  nobody is testing');
} else if (command === 'slots') {
  const n = Number(rest[0]);
  if (!(n > 0)) {
    console.error('say how many, as in: build-loop queue slots 2');
    process.exit(1);
  }
  writeFileSync(join(dir, 'slots.txt'), String(n));
  console.log(`queue: ${n} slot(s) on this machine`);
} else if (command === 'run') {
  const args = rest[0] === '--' ? rest.slice(1) : rest;
  if (args.length === 0) {
    console.error('say what to run, as in: build-loop queue run -- scripts/check.sh unit');
    process.exit(1);
  }
  const slot = acquire();
  const release = () => rmSync(slot, { recursive: true, force: true });
  const child = spawn(args[0], args.slice(1), { stdio: 'inherit', env: { ...process.env, CHECK_QUEUED: '1' } });
  for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
    process.on(sig, () => {
      child.kill(sig);
      release();
      process.exit(130);
    });
  }
  child.on('exit', (code, signal) => {
    release();
    process.exit(code ?? (signal ? 130 : 1));
  });
} else {
  console.error(`unknown command ${command}: use run -- <command>, status, or slots <n>`);
  process.exit(1);
}
