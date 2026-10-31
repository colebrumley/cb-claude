// Reads what a test run printed and says whether it passed: an optional helper for a project
// whose check command runs tests that cannot be trusted to set their exit code (an engine, a
// headless app). Test scripts print one fixed line per check, `[test] <suite>.<name> PASS` or
// `... FAIL <why>`, and end with exactly one `[tests] done passed=N failed=M`. The run passes only
// when that closing line is there once, M is 0, N is at least 1, and the log holds no `SCRIPT ERROR`
// or `ERROR: ` line. Anything else (a crash before the closing line, two closing lines) fails. A
// test that needs a retry to pass is not a pass: it goes into the flake register in docs/STATUS.md.
//   build-loop judge build/last.log        exit 0 when the run passed, 1 otherwise
import { readFileSync } from 'node:fs';

const file = process.argv[2] ?? 'build/last.log';
let text;
try {
  text = readFileSync(file, 'utf8');
} catch {
  console.log(`[judge] FAIL: no log at ${file}`);
  process.exit(1);
}
const lines = text.split('\n');
const fails = lines.filter((l) => /^\[test\] \S+ FAIL/.test(l));
const engineErrors = lines.filter((l) => /SCRIPT ERROR|^ERROR: /.test(l));
const done = lines.map((l) => /^\[tests\] done passed=(\d+) failed=(\d+)/.exec(l)).filter(Boolean);
for (const f of fails) console.log(f);
for (const e of engineErrors.slice(0, 20)) console.log(e);
const problems = [];
if (done.length !== 1) problems.push(done.length === 0 ? 'the run did not reach its closing "[tests] done" line' : `${done.length} closing lines (expected exactly one)`);
if (done.length === 1 && Number(done[0][2]) !== 0) problems.push(`${done[0][2]} check(s) failed`);
if (done.length === 1 && Number(done[0][1]) < 1) problems.push('no check passed');
if (fails.length > 0 && !problems.some((p) => p.endsWith('failed'))) problems.push(`${fails.length} FAIL line(s)`);
if (engineErrors.length > 0) problems.push(`${engineErrors.length} engine error line(s)`);
if (problems.length === 0) {
  console.log(`[judge] PASS: ${done[0][1]} checks`);
  process.exit(0);
}
console.log(`[judge] FAIL: ${problems.join('; ')}`);
process.exit(1);
