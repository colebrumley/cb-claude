// Keeps the backlog and the specs in the shape the loop depends on (references/backlog-format.md).
// Fails, naming the file and line, when:
//   - an item ID appears twice, or an item has no **Depends on:** or **Verify:** line (a planned-work
//     line that points at a spec has both in the spec);
//   - an item is `[!]` with no reason after it;
//   - a planned-work line names a spec that does not exist;
//   - a spec is missing a section, still holds template text, has a work item with no acceptance
//     bullet or no Verify line, or has an open question (`- Q:`) with no `Default:` for the worker;
//   - a file under `requiredDocs` in .build-loop.json is missing.
//   build-loop docs
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { idPattern, require_ } from './config.mjs';

const config = require_(process.cwd(), 'docs');
const at = (path) => join(config.top, path);
const problems = [];

if (!existsSync(at(config.backlog))) {
  console.log(`[docs] ${config.backlog} is missing`);
  process.exit(1);
}
const lines = readFileSync(at(config.backlog), 'utf8').split('\n');
const heading = new RegExp(`^- \\[([ x~!])\\] \\*\\*(${idPattern(config)})\\b([^*]*)\\*\\*(.*)$`);
const specLink = new RegExp(`— (${config.specs.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/[\\w.-]+\\.md)`);
const seen = new Map();
let item = null;
const close = () => {
  if (!item) return;
  if (!item.depends) problems.push(`${config.backlog}:${item.line} ${item.id}: no **Depends on:** line`);
  if (!item.verify) problems.push(`${config.backlog}:${item.line} ${item.id}: no **Verify:** line`);
  if (!item.reason) problems.push(`${config.backlog}:${item.line} ${item.id}: blocked without a reason`);
};
lines.forEach((text, i) => {
  const head = heading.exec(text);
  if (head) {
    close();
    const [, status, id, , rest] = head;
    if (seen.has(id)) problems.push(`${config.backlog}:${i + 1} ${id}: already defined at line ${seen.get(id)}`);
    seen.set(id, i + 1);
    const planned = specLink.exec(rest);
    if (planned && !existsSync(at(planned[1]))) problems.push(`${config.backlog}:${i + 1} ${id}: ${planned[1]} does not exist`);
    // a blocked item gives its reason on the heading line, after the title, or on the lines below it
    item = { id, status, line: i + 1, depends: Boolean(planned), verify: Boolean(planned), reason: status !== '!' || /\S/.test(rest.replace(specLink, '')) };
    return;
  }
  if (/^#{1,3} /.test(text)) {
    close();
    item = null;
    return;
  }
  if (!item) return;
  if (/^\s+\*\*Depends on:\*\*/.test(text)) item.depends = true;
  else if (/^\s+\*\*Verify:\*\*\s*\S/.test(text)) item.verify = true;
  else if (item.status === '!' && /\S/.test(text) && !/^- \[/.test(text)) item.reason = true;
});
close();

const SECTIONS = ['Goal', 'Non-goals', 'Shared surfaces', 'Work items', 'Open questions and decisions'];
const PLACEHOLDER = /<Title>|<title>|<date>|\bR-xxx\b|\bR-yyy\b|^\s*\.\.\.\s*$|^- \.\.\.$/;
const specs = existsSync(at(config.specs)) ? readdirSync(at(config.specs)).filter((f) => f.endsWith('.md') && f !== 'TEMPLATE.md') : [];
for (const name of specs) {
  const path = `${config.specs}/${name}`;
  const text = readFileSync(at(path), 'utf8').split('\n');
  if (!text.some((l) => /\bStatus: (proposed|approved|built)\b/.test(l))) problems.push(`${path}: no "Status: proposed | approved | built" line`);
  for (const section of SECTIONS) if (!text.some((l) => l.trim() === `## ${section}`)) problems.push(`${path}: no "## ${section}" section`);
  text.forEach((l, i) => {
    if (PLACEHOLDER.test(l)) problems.push(`${path}:${i + 1}: template text left in: ${l.trim().slice(0, 80)}`);
    if (/^- Q:/.test(l) && !/\bDefault:/.test(l)) problems.push(`${path}:${i + 1}: an open question with no "Default:" for the worker`);
  });
  // each work item: an Acceptance: line with at least one bullet under it, and a Verify: line
  let w = null;
  const closeItem = () => {
    if (!w) return;
    if (!w.bullets) problems.push(`${path}:${w.line} ${w.name}: no acceptance bullet`);
    if (!w.verify) problems.push(`${path}:${w.line} ${w.name}: no Verify: line`);
  };
  text.forEach((l, i) => {
    const head = /^### (W\d+)\b/.exec(l);
    if (head || /^## /.test(l)) {
      closeItem();
      w = head ? { name: head[1], line: i + 1, inAcceptance: false, bullets: 0, verify: false } : null;
      return;
    }
    if (!w) return;
    if (/^Acceptance:/.test(l)) w.inAcceptance = true;
    else if (/^Verify:\s*\S/.test(l)) {
      w.verify = true;
      w.inAcceptance = false;
    } else if (w.inAcceptance && /^- \S/.test(l)) w.bullets++;
  });
  closeItem();
}

for (const f of config.requiredDocs) if (!existsSync(at(f))) problems.push(`${f} is missing`);

if (problems.length === 0) {
  console.log(`[docs] ok: ${seen.size} items, ${specs.length} specs`);
  process.exit(0);
}
for (const p of problems) console.log(`[docs] ${p}`);
process.exit(1);
