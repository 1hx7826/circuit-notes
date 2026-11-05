import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
const files = [];
function walk(path) { for (const name of readdirSync(path)) { const file = join(path, name); if (statSync(file).isDirectory()) walk(file); else files.push(file); } }
walk('dist');
for (const file of files) {
  if (/\.(?:map|md|zip|env|log)$/.test(file)) throw new Error('Unexpected private/build file: ' + file);
  if (/\.(?:js|html|json|css)$/.test(file)) {
    const text = readFileSync(file, 'utf8');
    if (/gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|给 Codex 的笔记网站建设说明/.test(text)) throw new Error('Private or developer material found: ' + file);
  }
}
const html = readFileSync('dist/index.html', 'utf8');
if (!html.includes('/circuit-notes/assets/') || !html.includes('电路手记')) throw new Error('Incorrect Pages base or page title.');
console.log('Public output audited: ' + files.length + ' static files; Pages base /circuit-notes/.');
