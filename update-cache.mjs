/* Re-run after any HTML, JS, CSS, icon or font change. No npm install needed. */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = resolve(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}
const files = ['index.html', 'offline.html', 'manifest.webmanifest',
  ...walk(resolve(root, 'assets')).filter(path => !path.endsWith('.txt') && !path.endsWith('.input.css')).map(path => relative(root, path).replaceAll('\\', '/')),
  ...walk(resolve(root, 'icons')).map(path => relative(root, path).replaceAll('\\', '/'))
].sort();
const template = readFileSync(resolve(root, 'tools/sw.template.js'), 'utf8');
const hash = createHash('sha256').update(template);
for (const file of files) hash.update(file).update(readFileSync(resolve(root, file)));
const name = 'imsc-library-shell-' + hash.digest('hex').slice(0, 16);
writeFileSync(resolve(root, 'sw.js'), template.replace('__CACHE_ID__', name).replace('__PRECACHE_PATHS__', JSON.stringify(files.map(f => './' + f), null, 2)));
console.log(`Service worker ready: ${files.length} files; ${name}`);
