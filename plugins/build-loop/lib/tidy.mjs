// Removes what merged work leaves behind: worktrees under the worktree folder (`worktrees` in
// .build-loop.json) whose pull request has merged at their current tip (or whose branch is in
// origin/<base>, or in <base> when there is no remote) and that hold no uncommitted changes, their branches
// here and on origin, local or remote branches merged the same way, and board claims whose worktree
// is gone. A worktree used in the last half hour, the one this is run from, and the main checkout
// are never touched. "Used" means a commit, checkout or reset in it: its ref log's age.
// The main checkout is only ever fast-forwarded to origin/<base>, and only when it is on <base> with
// no change to a tracked file, so the owner's copy keeps up with what merged.
//   build-loop tidy               do it
//   build-loop tidy --dry-run     only say what would go
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, rmdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { require_ } from './config.mjs';

const dry = process.argv.includes('--dry-run');
const useGh = process.env['TIDY_GH'] !== '0';
const git = (cwd, ...args) => {
  try {
    return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
};
const say = (text) => console.log(`${dry ? 'would ' : ''}${text}`);

const config = require_(process.cwd(), 'tidy');
const { top: here, common, main } = config;
const trunk = config.base;
git(main, 'fetch', '--prune', '--quiet', 'origin');
// Without a remote, work lands by fast-forwarding the base branch (build-loop land), so it is the base.
const hasOrigin = Boolean(git(main, 'rev-parse', '--verify', '--quiet', `origin/${trunk}`));
const base = hasOrigin ? `origin/${trunk}` : trunk;

/**
 * Branches whose pull request merged, by GitHub's account, with the commit each was merged at: a
 * squash merge leaves the branch outside the base, so the name alone is not enough, and a branch
 * that has moved on since its merge may hold new work.
 */
const merged = new Map();
if (useGh && hasOrigin) {
  try {
    const json = process.env['TIDY_GH_JSON'] ? readFileSync(process.env['TIDY_GH_JSON'], 'utf8') : execFileSync('gh', ['pr', 'list', '--state', 'merged', '--limit', '300', '--json', 'headRefName,headRefOid'], { cwd: main, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    for (const { headRefName, headRefOid } of JSON.parse(json)) {
      if (!merged.has(headRefName)) merged.set(headRefName, new Set());
      merged.get(headRefName).add(headRefOid);
    }
  } catch {
    console.log(`tidy: gh is not available; going by ${base} alone`);
  }
}
const inMain = (ref) => Boolean(ref) && execOk(main, 'merge-base', '--is-ancestor', ref, base);
function execOk(cwd, ...args) {
  try {
    execFileSync('git', args, { cwd, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}
/** `name` as GitHub knows the branch; `ref` where its tip is here (the name, or origin/<name>). */
const isMerged = (name, ref = name) => name !== trunk && ((merged.get(name)?.has(git(main, 'rev-parse', ref)) ?? false) || inMain(ref));
const home = join(main, config.worktrees) + '/';

/** The worktrees, from the main checkout's list. */
const worktrees = [];
for (const block of git(main, 'worktree', 'list', '--porcelain').split('\n\n')) {
  const path = /^worktree (.+)$/m.exec(block)?.[1];
  const branch = /^branch refs\/heads\/(.+)$/m.exec(block)?.[1] ?? '';
  if (path) worktrees.push({ path, branch });
}

/** A claim on the board names the worktree doing the work: that worktree stays, whatever its state. */
const claims = join(common, 'board', 'claims');
const claimed = new Set(existsSync(claims) ? readdirSync(claims).filter((n) => n.endsWith('.json')).map((n) => JSON.parse(readFileSync(join(claims, n), 'utf8')).worktree) : []);

const gone = [];
for (const { path, branch } of worktrees) {
  if (path === main || path === here || !`${path}/`.startsWith(home)) continue;
  if (!existsSync(path)) {
    say(`prune the record of ${path}, which no longer exists`);
    continue;
  }
  if (!isMerged(branch)) continue;
  if (claimed.has(path)) {
    console.log(`keep ${path}: ${branch} is merged but the board still has a claim from it`);
    continue;
  }
  // last commit, checkout or reset in the worktree: its ref log (git status would refresh the index)
  const gitdir = git(path, 'rev-parse', '--git-dir');
  const log = gitdir && join(resolve(path, gitdir), 'logs', 'HEAD');
  const idle = !log || !existsSync(log) || Date.now() - statSync(log).mtimeMs > 30 * 60 * 1000;
  if (git(path, 'status', '--porcelain')) {
    console.log(`keep ${path}: ${branch} is merged but the tree has uncommitted changes`);
    continue;
  }
  if (!idle) {
    console.log(`keep ${path}: ${branch} is merged but the tree was used in the last half hour`);
    continue;
  }
  say(`remove worktree ${path} (${branch}, merged)`);
  if (dry || execOk(main, 'worktree', 'remove', path)) gone.push(path);
  else console.log(`keep ${path}: git would not remove it (locked, or in use)`);
}
if (!dry) execOk(main, 'worktree', 'prune');

const checkedOut = new Set(worktrees.filter((w) => !gone.includes(w.path)).map((w) => w.branch));
for (const branch of git(main, 'for-each-ref', '--format=%(refname:short)', 'refs/heads').split('\n').filter(Boolean)) {
  if (branch === trunk || checkedOut.has(branch) || !isMerged(branch)) continue;
  say(`delete local branch ${branch} (merged)`);
  if (!dry) execOk(main, 'branch', '-D', branch);
}
for (const ref of git(main, 'for-each-ref', '--format=%(refname)', 'refs/remotes/origin/').split('\n').filter(Boolean)) {
  const branch = ref.replace(/^refs\/remotes\/origin\//, '');
  if (branch === trunk || branch === 'HEAD' || checkedOut.has(branch) || !isMerged(branch, `origin/${branch}`)) continue;
  // delete only the tip that was inspected: a push from elsewhere meanwhile keeps the branch
  const tip = git(main, 'rev-parse', ref);
  say(`delete origin/${branch} (merged)`);
  if (!dry) execOk(main, 'push', '--quiet', `--force-with-lease=refs/heads/${branch}:${tip}`, 'origin', `:refs/heads/${branch}`);
}

// claims whose worktree is gone, removed under the board's own per-item lock (lib/board.mjs)
if (existsSync(claims)) {
  for (const name of readdirSync(claims).filter((n) => n.endsWith('.json'))) {
    const file = join(claims, name);
    const lock = file.replace(/\.json$/, '.lock');
    let claim = JSON.parse(readFileSync(file, 'utf8'));
    if (existsSync(claim.worktree)) continue;
    say(`release the board claim ${claim.id}: its worktree is gone`);
    if (dry) continue;
    try {
      mkdirSync(lock);
    } catch {
      console.log(`  left ${claim.id}: the board is busy with it`);
      continue;
    }
    try {
      claim = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null;
      if (claim && !existsSync(claim.worktree)) rmSync(file, { force: true });
    } finally {
      rmdirSync(lock);
    }
  }
}
// the main checkout: forward to origin/<base>, never a merge, never over someone's changes or an
// ignored file of theirs
if (hasOrigin && git(main, 'branch', '--show-current') === trunk && git(main, 'rev-parse', trunk) !== git(main, 'rev-parse', base)) {
  if (git(main, 'status', '--porcelain', '--untracked-files=no')) console.log('keep the main checkout where it is: it has uncommitted changes');
  else if (!execOk(main, 'merge-base', '--is-ancestor', trunk, base)) console.log(`keep the main checkout where it is: ${trunk} has commits ${base} does not`);
  else {
    say(`fast-forward the main checkout to ${base}`);
    if (!dry && !execOk(main, 'merge', '--ff-only', '--no-overwrite-ignore', '--quiet', base)) console.log('  git would not fast-forward it');
  }
}
console.log(dry ? 'tidy: dry run, nothing changed' : 'tidy: done');
