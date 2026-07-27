/**
 * Copy Decision Lens build output to Astro public directory.
 * Run after build:dl, before astro build.
 */
import { copyFileSync, mkdirSync, readdirSync, rmSync, statSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const root = join(__dirname, '..');

const dlDist = join(root, 'products/decision-lens/dist');
const publicDL = join(root, 'public/tools/decision-lens');

// Clear old assets
const assetsDir = join(publicDL, 'assets');
if (readdirSync(publicDL).includes('assets')) {
  rmSync(assetsDir, { recursive: true, force: true });
}

// Copy all files from DL dist to public/tools/decision-lens
function copyDir(src, dest) {
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src)) {
    const s = join(src, entry);
    const d = join(dest, entry);
    if (statSync(s).isDirectory()) {
      copyDir(s, d);
    } else {
      copyFileSync(s, d);
    }
  }
}

copyDir(dlDist, publicDL);
console.log('Copied Decision Lens build to public/tools/decision-lens/');
