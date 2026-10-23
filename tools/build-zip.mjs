// Packs the diagram exports and their editable sources into downloads/dao-voting-diagrams.zip.
import { rmSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'downloads/dao-voting-diagrams.zip');
rmSync(OUT, { force: true });
execFileSync('zip', ['-X', '-q', '-r', OUT, 'diagrams', '-x', '*.DS_Store'], { cwd: ROOT, stdio: 'inherit' });
console.log(`wrote ${OUT}`);
