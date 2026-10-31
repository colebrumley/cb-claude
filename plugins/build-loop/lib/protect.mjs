// Refuses an edit to a file nobody should edit by hand: generated caches, sidecars, build output.
// The project lists them in .build-loop.json as `protect`: [{ "pattern": "<regular expression on
// the path>", "reason": "<what to do instead>" }]. A repository without the file, or without the
// list, is let through. Registered as a PreToolUse hook on Edit, Write and MultiEdit by the plugin.
import { readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { load } from './config.mjs';

let input;
try {
  input = JSON.parse(readFileSync(0, 'utf8'));
} catch {
  process.exit(0);
}
const path = String(input?.tool_input?.file_path ?? '');
if (!path) process.exit(0);
let config = null;
try {
  config = load(dirname(path)) ?? load(String(input?.cwd ?? process.cwd()));
} catch {
  process.exit(0);
}
if (!config) process.exit(0);
const relative = path.startsWith(`${config.top}/`) ? path.slice(config.top.length + 1) : path;
for (const { pattern, reason } of config.protect) {
  if (new RegExp(pattern).test(relative)) {
    console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: `${relative} is not edited by hand. ${reason ?? ''}`.trim() } }));
    process.exit(0);
  }
}
process.exit(0);
