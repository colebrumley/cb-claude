// The one gate, run from anywhere in the repository. Two stages are the loop's own: docs (the
// backlog's and the specs' shape, lib/docs-check.mjs) and words (this branch against the word list,
// when the project has one). Every other stage is the project's: `check.command` from
// .build-loop.json, run from the top of the tree with the stage as its one argument, or with none
// for everything. Each stage prints `[check] <stage> PASS` or `... FAIL`, the first failure ends the
// run, and the last line is `[check] done PASS` or `[check] done FAIL at <stage>`.
// A project stage waits for a check slot (lib/queue.mjs) unless `check.light` names it, so many
// workers can build at once while only a few test at once. docs and words never wait.
//   build-loop check            docs, words, then the project's whole gate
//   build-loop check <stage>    one stage
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { require_ } from './config.mjs';

const lib = dirname(fileURLToPath(import.meta.url));
const config = require_(process.cwd(), 'check');
const stage = process.argv[2] ?? '';
const own = ['docs', 'words'];

const fail = (name) => {
  console.log(`[check] ${name} FAIL`);
  console.log(`[check] done FAIL at ${name}`);
  process.exit(1);
};
const node = (script, ...args) => spawnSync(process.execPath, [join(lib, script), ...args], { cwd: config.top, stdio: 'inherit' }).status === 0;

if (stage === 'docs' || !stage) {
  if (!node('docs-check.mjs')) fail('docs');
  console.log('[check] docs PASS');
}
if (stage === 'words' || !stage) {
  if (config.words.file) {
    if (!node('guard.mjs', '--check')) fail('words');
    console.log('[check] words PASS');
  } else if (stage === 'words') console.log('[check] words SKIP (no word list in .build-loop.json)');
}
if (!own.includes(stage)) {
  const name = stage || 'gate';
  const queued = process.env['CHECK_QUEUED'] || config.check.light.includes(stage);
  const command = `${config.check.command}${stage ? ` '${stage.replace(/'/g, "'\\''")}'` : ''}`;
  const run = queued
    ? spawnSync('sh', ['-c', command], { cwd: config.top, stdio: 'inherit' })
    : spawnSync(process.execPath, [join(lib, 'queue.mjs'), 'run', '--', 'sh', '-c', command], { cwd: config.top, stdio: 'inherit' });
  if (run.status !== 0) fail(name);
  console.log(`[check] ${name} PASS`);
}
console.log('[check] done PASS');
