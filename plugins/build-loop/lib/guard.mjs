// Refuses, before it runs, a shell command that would break a rule every session is under:
//   - code changes, branch switches and test suites happen in a worktree, never in the main checkout;
//   - nothing that is about to become public (a commit, a push, a pull request) may match the
//     project's word list (`words.file` in .build-loop.json), when it has one; the list itself and
//     the paths under `words.exempt` are not scanned.
// A repository without .build-loop.json has not opted in, and the hook lets everything through there.
// Registered as a PreToolUse hook on Bash by the plugin; the hook's JSON arrives on stdin.
//   node lib/guard.mjs            as the hook
//   build-loop words              by hand: scan this branch against origin/<base> (or <base>) and its log
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { load, baseRef } from './config.mjs';

const git = (cwd, ...args) => {
  try {
    return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 * 1024 * 1024 }).trim();
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
const toplevel = (cwd) => real(git(cwd, 'rev-parse', '--show-toplevel'));
const commonDir = (cwd) => {
  const dir = git(cwd, 'rev-parse', '--git-common-dir');
  return dir ? real(resolve(cwd, dir)) : '';
};
const settings = (cwd) => load(cwd);
const wordsFile = (config) => process.env['GUARD_WORDS'] ?? (config.words.file ? join(config.top, config.words.file) : null);

/** Commands that edit the tree or the branch, or run the gate: worktree only. */
const GIT_CHANGES = /\bgit\s+(?:-C\s+\S+\s+)?(?:commit|checkout|switch|stash|merge|rebase|reset|cherry-pick|revert|am|apply|pull|restore|rm|mv|add)\b|\bbuild-loop\s+(?:check|land)\b/;
const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** The tree-changing git commands, the gate, the project's check command and its `check.heavy` patterns. */
const changesTree = (config) => {
  // the check command as a step of its own (`scripts/check.sh unit`, `sh ./scripts/check.sh`), not a mention (`cat scripts/check.sh`)
  const own = `^\\s*(?:\\w+=\\S*\\s+)*(?:(?:ba)?sh\\s+)?(?:\\./)?${escape(config.check.command.trim().replace(/^\.\//, ''))}(?:\\s|$)`;
  const heavy = [own, ...config.check.heavy];
  const project = new RegExp(heavy.map((p) => `(?:${p})`).join('|'));
  return (step) => GIT_CHANGES.test(step) || project.test(step);
};
/** Commands after which text is public. */
const GOES_PUBLIC = /\bgit\s+(?:-C\s+\S+\s+)?(?:commit|push|tag|notes)\b|\bgh\s+(?:pr|issue|release|repo)\s+(?:create|edit|comment|review|merge|close|reopen)\b|\bgh\s+api\b.*(?:\s-[fF]\s|--field|--input|--method|\s-X\s)/;

const unquote = (m) => m?.[2] ?? m?.[3] ?? m?.[4];
const at = (cwd, target) => (isAbsolute(target) ? target : resolve(cwd, target.replace(/^~/, process.env['HOME'] ?? '~')));

/**
 * The simple commands the shell will run one after another, each with the directory it acts in:
 * a `cd` moves every later one, git's `-C` moves only its own.
 */
function steps(command, cwd) {
  const out = [];
  let current = cwd;
  for (const step of command.split(/\s*(?:&&|\|\||;|\||\n)\s*/).filter(Boolean)) {
    const cd = /^cd\s+("([^"]+)"|'([^']+)'|(\S+))\s*$/.exec(step);
    if (cd) {
      current = at(current, unquote(cd));
      continue;
    }
    const dashC = /\bgit\s+-C\s+("([^"]+)"|'([^']+)'|(\S+))/.exec(step);
    out.push({ step, dir: unquote(dashC) ? at(current, unquote(dashC)) : current });
  }
  return out;
}

/** What a `git push` publishes: the source side of each refspec, every branch for --all, else HEAD. */
function pushedRefs(step) {
  const words = step.replace(/^.*\bgit\s+(?:-C\s+(?:"[^"]+"|'[^']+'|\S+)\s+)?push\b/, '').trim().split(/\s+/).filter(Boolean);
  if (words.some((w) => w === '--all' || w === '--branches' || w === '--mirror')) return ['--branches'];
  const positional = words.filter((w) => !w.startsWith('-'));
  const refs = positional.slice(1).map((spec) => spec.replace(/^\+/, '').split(':')[0]).filter(Boolean);
  return refs.length > 0 ? refs : ['HEAD'];
}

/** Files the command reads a message or body from: commit -F, gh --body-file and the like. */
function messageFiles(command, cwd) {
  const files = [];
  const re = /(?:^|\s)(?:-F|--file|--body-file|--notes-file|--template)[=\s]+("([^"]+)"|'([^']+)'|(\S+))/g;
  for (let m = re.exec(command); m; m = re.exec(command)) files.push(at(cwd, unquote(m)));
  return files;
}

/** The patterns of the word list: one regular expression a line, `#` lines are comments. */
function patterns(config) {
  const file = wordsFile(config);
  if (!file || !existsSync(file)) return { file, list: null };
  const list = readFileSync(file, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => new RegExp(line, 'i'));
  return { file, list };
}

/**
 * Lines that are about to become public: the command, the files it reads a message from, what is
 * staged, what is in the tree, new files, and before a push or a pull request every commit not yet
 * on origin/<base>, message and patch alike (history is public too, so a line added and removed again
 * on the branch still counts).
 */
function publicText(command, dir, refs, config) {
  const sources = [];
  /** Paths the word list does not apply to: the list itself and `words.exempt` (a path, or a folder ending in /). */
  const exempt = (path) => path === config.words.file || config.words.exempt.some((e) => (e.endsWith('/') ? path.startsWith(e) : path === e));
  const added = (label, diff) => {
    const lines = [];
    for (const chunk of diff.split(/^(?=diff --git )/m)) {
      const path = /^diff --git a\/.*? b\/(.+)$/m.exec(chunk)?.[1];
      if (path && exempt(path)) continue;
      lines.push(...chunk.split('\n').filter((line) => line.startsWith('+') && !/^\+\+\+ /.test(line)));
    }
    sources.push({ label, lines });
  };
  if (command) sources.push({ label: 'command', lines: command.split('\n') });
  for (const file of messageFiles(command, dir)) {
    try {
      sources.push({ label: `message file ${file}`, lines: readFileSync(file, 'utf8').split('\n') });
    } catch {
      // not there yet, or not a file
    }
  }
  added('staged changes', git(dir, 'diff', '--cached'));
  added('changes against HEAD', git(dir, 'diff', 'HEAD'));
  for (const path of git(dir, 'ls-files', '--others', '--exclude-standard').split('\n').filter(Boolean)) {
    if (exempt(path)) continue;
    const full = join(dir, path);
    try {
      if (statSync(full).size > 512 * 1024 || /\.(png|woff2?|ttf|zip|ico|jpe?g|gif)$/i.test(path)) continue;
      sources.push({ label: `new file ${path}`, lines: readFileSync(full, 'utf8').split('\n') });
    } catch {
      // unreadable: nothing to scan
    }
  }
  const base = git(dir, 'rev-parse', '--verify', '--quiet', baseRef(config, dir)) ? baseRef(config, dir) : '';
  if (refs.length > 0 && base) {
    for (const ref of refs) {
      const range = ref === '--branches' ? ['--branches', '--not', base] : [`${base}..${ref}`];
      sources.push({ label: `commit messages not on ${base} (${ref})`, lines: git(dir, 'log', '--format=%B', ...range).split('\n') });
      added(`commits not on ${base} (${ref})`, git(dir, 'log', '-p', '--diff-merges=first-parent', '--format=', ...range));
    }
  }
  return sources;
}

function matches(sources, list) {
  const hits = [];
  for (const { label, lines } of sources) {
    for (const line of lines) {
      const pattern = list.find((re) => re.test(line));
      if (pattern) hits.push(`${label}: ${line.trim().slice(0, 160)}   [${pattern.source}]`);
      if (hits.length >= 12) return hits;
    }
  }
  return hits;
}

const deny = (reason) => {
  console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason } }));
  process.exit(0);
};
const warn = (text) => {
  console.log(JSON.stringify({ systemMessage: text }));
  process.exit(0);
};

if (process.argv.includes('--check')) {
  const dir = toplevel(process.cwd());
  const config = dir && settings(dir);
  if (!config) {
    console.error(dir ? 'words: this repository has no .build-loop.json; run /build-loop:setup first' : 'words: not in a git repository');
    process.exit(2);
  }
  const { file, list } = patterns(config);
  if (!list) {
    console.error(`words: no word list${file ? ` at ${file}` : ' in .build-loop.json'}; nothing checked`);
    process.exit(2);
  }
  const hits = matches(publicText('', dir, ['HEAD'], config), list);
  for (const hit of hits) console.log(hit);
  console.log(hits.length === 0 ? `words: nothing on this branch matches ${config.words.file}` : `words: ${hits.length} line(s) match ${config.words.file}; reword them before they go public`);
  process.exit(hits.length === 0 ? 0 : 1);
}

let input;
try {
  input = JSON.parse(readFileSync(0, 'utf8'));
} catch {
  process.exit(0);
}
try {
  const command = String(input?.tool_input?.command ?? '');
  const cwd = String(input?.cwd ?? process.cwd());
  if (!command) process.exit(0);
  // each step is judged by the settings of the repository it runs in; one that has not opted in is let through
  const plan = steps(command, cwd).map((s) => ({ ...s, config: toplevel(s.dir) ? settings(s.dir) : null })).filter((s) => s.config);
  const changing = plan.find(({ step, dir, config }) => changesTree(config)(step) && toplevel(dir) === dirname(commonDir(dir)));
  if (changing) {
    const { worktrees } = changing.config;
    deny(
      `${toplevel(changing.dir)} is the main checkout. Code changes, branch switches, stashes and checks happen in a worktree of your own under ${worktrees}/ (CLAUDE.md, rule 1). ` +
        `If this session already has one, run the command from there; otherwise make one: git worktree add ${worktrees}/<name> -b <name> ${baseRef(changing.config, changing.dir)}. ` +
        `The owner may run this from a terminal.`,
    );
  }

  const publishing = plan.filter(({ step, config }) => GOES_PUBLIC.test(step) && config.words.file);
  if (publishing.length > 0) {
    const { file, list } = patterns(publishing[0].config);
    if (!list) warn(`guard: no word list at ${file}, so the word check did not run.`);
    const hits = [];
    for (const { step, dir, config } of publishing) {
      const refs = /\bpush\b/.test(step) ? pushedRefs(step) : /\bgh\s/.test(step) ? ['HEAD'] : [];
      hits.push(...matches(publicText(hits.length === 0 ? command : '', dir, refs, config), list));
    }
    if (hits.length > 0) {
      deny(`This would make text public that matches ${publishing[0].config.words.file} (the project's word list; CLAUDE.md says why). Reword these, then try again:\n${hits.join('\n')}`);
    }
  }
} catch (error) {
  warn(`guard: could not check this command (${error instanceof Error ? error.message : String(error)}); it was allowed.`);
}
