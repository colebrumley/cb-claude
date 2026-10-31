// Lands a worktree's branch on the base branch (`base` in .build-loop.json, main by default)
// without a remote: fast-forwards the main checkout's base branch to this branch, from the worktree,
// after the checks a pull request would have gated.
//   - run from a worktree of your own, on its own branch, with nothing uncommitted;
//   - the branch must already contain the base (merge it in first, then run the checks again);
//   - the main checkout must be on the base branch with no change to a tracked file;
//   - the word check (build-loop words) must pass on the branch, when the project has a word list;
//   - with a remote named origin, this refuses: land through a pull request then.
//   build-loop land               do it
//   build-loop land --dry-run     only say what would happen
import { execFileSync, spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { require_ } from './config.mjs';

const dry = process.argv.includes('--dry-run');
const git = (cwd, ...args) => {
  try {
    return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
};
const ok = (cwd, ...args) => {
  try {
    execFileSync('git', args, { cwd, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
};
const fail = (message) => {
  console.error(`land: ${message}`);
  process.exit(1);
};

const config = require_(process.cwd(), 'land');
const { top: here, main, base } = config;
if (resolve(here) === resolve(main)) fail('run this from your worktree, not the main checkout (CLAUDE.md, rule 1)');
if (git(main, 'remote')) fail('this repository has a remote; land through a pull request instead (the worker protocol, step 6)');

const branch = git(here, 'branch', '--show-current');
if (!branch) fail('this worktree is not on a branch');
if (branch === base) fail(`this worktree is on ${base}; land a work branch`);
if (git(here, 'status', '--porcelain')) fail('commit your work first; nothing uncommitted may land');
if (git(main, 'branch', '--show-current') !== base) fail(`the main checkout is not on ${base}; the owner decides what to do there`);
if (git(main, 'status', '--porcelain', '--untracked-files=no')) fail('the main checkout has uncommitted changes to tracked files; they are someone else\'s, leave them and tell the owner');
if (!ok(here, 'merge-base', '--is-ancestor', base, 'HEAD')) fail(`${base} has commits this branch does not: git merge ${base}, run build-loop check again, then land`);
if (git(here, 'rev-parse', 'HEAD') === git(main, 'rev-parse', base)) {
  console.log(`land: ${base} is already at this branch; nothing to do`);
  process.exit(0);
}

const guard = config.words.file ? spawnSync(process.execPath, [join(dirname(fileURLToPath(import.meta.url)), 'guard.mjs'), '--check'], { encoding: 'utf8', cwd: here }) : { status: 0 };
if (guard.status !== 0) {
  process.stdout.write(guard.stdout ?? '');
  fail('the word check refuses this branch; reword, commit, and land again');
}

const commits = git(here, 'log', '--oneline', `${base}..HEAD`).split('\n').filter(Boolean);
console.log(`land: ${branch} brings ${commits.length} commit(s) to ${base}:`);
for (const line of commits) console.log(`  ${line}`);
if (dry) {
  console.log('land: dry run, nothing changed');
  process.exit(0);
}
if (!ok(main, 'merge', '--ff-only', '--no-overwrite-ignore', '--quiet', branch)) fail('git would not fast-forward the main checkout; it may have moved, or a file of its own is in the way');
console.log(`land: ${base} is now at ${git(main, 'rev-parse', '--short', base)} (${branch}). Note the board, release the claim, then build-loop tidy.`);
