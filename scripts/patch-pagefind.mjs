import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const downloadJs = join(projectRoot, 'node_modules', 'pagefind', 'lib', 'download.js');

if (!existsSync(downloadJs)) {
  process.exit(0);
}

const original = readFileSync(downloadJs, 'utf8');
const patched = original.replace(
  "const REPO = 'CloudCannon/pagefind';",
  "const REPO = 'Pagefind/pagefind';"
);

if (original === patched) {
  process.exit(0);
}

writeFileSync(downloadJs, patched, 'utf8');
console.log('Patched pagefind download.js to use Pagefind/pagefind repo');
