// Throwaway repositories for the tests: a main checkout on main with one commit and, when asked,
// a .build-loop.json, plus worktrees under .claude/worktrees/.
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
export const LIB = (script) => join(root, 'lib', script);
export const BIN = join(root, 'bin', 'build-loop');
export const env = { ...process.env, TIDY_GH: '0', GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t' };
export const git = (cwd, ...args) => execFileSync('git', args, { cwd, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();

/** A repository with one commit; `config` (an object) becomes its committed .build-loop.json. */
export function repo(config, files = {}) {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'build-loop-')));
  git(tmpdir(), 'init', '-q', '-b', 'main', dir);
  writeFileSync(join(dir, 'a.txt'), 'a\n');
  if (config) writeFileSync(join(dir, '.build-loop.json'), JSON.stringify(config, null, 2));
  for (const [path, text] of Object.entries(files)) {
    execFileSync('mkdir', ['-p', dirname(join(dir, path))]);
    writeFileSync(join(dir, path), text);
  }
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', 'init');
  return dir;
}

/** A worktree of `dir` on a new branch `name`, with one commit of its own. */
export function worktree(dir, name, commit = true) {
  const path = join(dir, '.claude', 'worktrees', name);
  git(dir, 'worktree', 'add', '-q', path, '-b', name, 'main');
  if (commit) {
    writeFileSync(join(path, `${name}.txt`), 'x\n');
    git(path, 'add', `${name}.txt`);
    git(path, 'commit', '-q', '-m', name);
  }
  return path;
}

/** Run a lib script as a hook, fed the JSON Claude Code sends. */
export const hook = (script, input, extra = {}) => {
  const run = spawnSync('node', [LIB(script)], { input: JSON.stringify(input), encoding: 'utf8', env: { ...env, ...extra }, cwd: input.cwd });
  return { code: run.status, out: run.stdout.trim(), err: run.stderr.trim() };
};
export const decision = (out) => (out ? JSON.parse(out).hookSpecificOutput?.permissionDecision : undefined);

/** Run the build-loop command in `cwd`. */
export const cli = (cwd, ...args) => {
  const run = spawnSync(BIN, args, { cwd, env, encoding: 'utf8' });
  return { code: run.status, out: run.stdout, err: run.stderr };
};
