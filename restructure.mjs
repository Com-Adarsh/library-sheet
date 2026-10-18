#!/usr/bin/env node
// Restores the folder layout that index.html, sw.js and the README expect.
// Run once from the repository root:   node restructure.mjs
// Safe to re-run: it skips anything already moved and never overwrites a file.

import { existsSync, mkdirSync, renameSync, copyFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { spawnSync } from 'node:child_process';

if (!existsSync('index.html')) {
  console.error('index.html not found. Run this from the repository root.');
  process.exit(1);
}

// Files that belong in a sub-folder (moved)
const MOVE = {
  'assets': ['app.js', 'config.js', 'core.js', 'pwa.js', 'storage.js', 'styles.css', 'styles.input.css'],
  'assets/vendor': ['vue.global.prod.js', 'papaparse.min.js', 'VUE-LICENSE.txt', 'PAPAPARSE-LICENSE.txt', 'TAILWIND-LICENSE.txt'],
  'assets/fonts': ['fonts.css', 'plus-jakarta-0.ttf', 'plus-jakarta-1.ttf', 'plus-jakarta-2.ttf', 'OFL.txt'],
  'icons': ['icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png'],
  'tools': ['update-cache.mjs', 'sw.template.js'],
  'tests': ['pwa.test.cjs'],
};

// Images are copied, not moved, so anything still pointing at the root keeps working
const COPY = {
  'assets/images': ['abhimanyu.png', 'sfi-imsc-logo.png', 'cusat.jpg'],
};

let moved = 0, copied = 0, skipped = 0;

function place(dir, file, op) {
  const dest = `${dir}/${file}`;
  if (!existsSync(file)) { skipped++; return; }
  if (existsSync(dest)) { console.log(`skip   ${dest} (already there)`); skipped++; return; }
  mkdirSync(dirname(dest), { recursive: true });
  if (op === 'move') { renameSync(file, dest); moved++; console.log(`moved  ${file} -> ${dest}`); }
  else { copyFileSync(file, dest); copied++; console.log(`copied ${file} -> ${dest}`); }
}

for (const [dir, files] of Object.entries(MOVE)) files.forEach(f => place(dir, f, 'move'));
for (const [dir, files] of Object.entries(COPY)) files.forEach(f => place(dir, f, 'copy'));

console.log(`\nDone: ${moved} moved, ${copied} copied, ${skipped} skipped.\n`);

// Regenerate the service-worker cache list, then run the repo's own checks
function run(label, args) {
  if (!existsSync(args[args.length - 1])) { console.log(`(${label}: file missing, skipped)`); return; }
  console.log(`> node ${args.join(' ')}`);
  const r = spawnSync(process.execPath, args, { stdio: 'inherit' });
  if (r.status !== 0) console.log(`\n${label} reported problems. Copy the output above and share it.`);
}

run('cache update', ['tools/update-cache.mjs']);
run('tests', ['--test', 'tests/pwa.test.cjs']);

console.log('\nNext: commit everything (including the regenerated sw.js) in ONE commit and push.');
