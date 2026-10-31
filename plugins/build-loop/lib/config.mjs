// The project's build-loop settings: `.build-loop.json` at the repository's top level, merged over
// the defaults below. A repository without the file has not opted in, and every hook does nothing
// there; the commands say so and stop. `/build-loop:setup` writes the file.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

export const FILE = '.build-loop.json';

export const DEFAULTS = {
  // the branch work lands on, and the remote one is origin/<base>
  base: 'main',
  // where each session's worktree lives, relative to the main checkout
  worktrees: '.claude/worktrees',
  backlog: 'REQUIREMENTS.md',
  specs: 'docs/specs',
  // item IDs are <idPrefix>-<digits>, as in R-104
  idPrefix: 'R',
  // files the docs stage requires to exist
  requiredDocs: [],
  check: {
    // the project's gate; `build-loop check <stage>` runs it with the stage as its one argument
    command: 'scripts/check.sh',
    // stages cheap enough to skip the check queue
    light: [],
    // more commands (regular expressions) that only run in a worktree and only with a check slot
    heavy: [],
  },
  // a word list (one regular expression a line, # for comments) refused in anything about to go public
  words: { file: null, exempt: [] },
  // files nobody edits by hand: [{ "pattern": "<regular expression>", "reason": "<what to do instead>" }]
  protect: [],
  review: {
    // codex, or none (the worker protocol then uses /critique)
    tool: 'codex',
    // one paragraph telling the reviewer what this repository is and where things live
    context: '',
    // extra things the reviewer looks for, one line each
    focus: [],
    // ask CodeRabbit to read the pull request beside Codex
    coderabbit: false,
  },
  models: {
    plan: { model: 'fable', effort: 'high' },
    build: { model: 'opus', effort: 'medium' },
  },
};

const git = (cwd, ...args) => {
  try {
    return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
};
const real = (path) => {
  try {
    return realpathSync(path);
  } catch {
    return path;
  }
};

const merge = (base, over) => {
  if (Array.isArray(base) || typeof base !== 'object' || base === null) return over === undefined ? base : over;
  const out = { ...base };
  for (const [key, value] of Object.entries(over ?? {})) out[key] = key in base ? merge(base[key], value) : value;
  return out;
};

/** The repository around `cwd`: its top level, the main checkout, and the shared git directory. */
export function where(cwd = process.cwd()) {
  const top = git(cwd, 'rev-parse', '--show-toplevel');
  if (!top) return null;
  const common = real(resolve(cwd, git(cwd, 'rev-parse', '--git-common-dir')));
  return { top: real(top), common, main: dirname(common) };
}

/**
 * The settings for the repository around `cwd`, or null when it has not opted in. A worktree may
 * not have the file yet (it was made before setup landed), so the main checkout's copy counts too.
 */
export function load(cwd = process.cwd()) {
  const at = where(cwd);
  if (!at) return null;
  const file = [join(at.top, FILE), join(at.main, FILE)].find((f) => existsSync(f));
  if (!file) return null;
  let raw;
  try {
    raw = JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    throw new Error(`${file} is not valid JSON: ${error.message}`);
  }
  return { ...merge(DEFAULTS, raw), ...at, file };
}

/** load(), or stop with a pointer to setup. For commands run by hand, not hooks. */
export function require_(cwd = process.cwd(), who = 'build-loop') {
  let config;
  try {
    config = load(cwd);
  } catch (error) {
    console.error(`${who}: ${error.message}`);
    process.exit(2);
  }
  if (!config) {
    console.error(`${who}: this repository has no ${FILE}; run /build-loop:setup first`);
    process.exit(2);
  }
  return config;
}

/** origin/<base> when there is one, else <base>. */
export const baseRef = (config, cwd = config.top) => (git(cwd, 'rev-parse', '--verify', '--quiet', `origin/${config.base}`) ? `origin/${config.base}` : config.base);

export const idPattern = (config) => `${config.idPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-\\d+`;
