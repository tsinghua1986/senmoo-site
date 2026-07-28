/**
 * Copy Decision Lens build output to Astro public directory.
 * Run after build:dl, before astro build.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const root = join(__dirname, '..');

const dlDist = join(root, 'products/decision-lens/dist');
const publicDL = join(root, 'public/tools/decision-lens');

// Clear old assets
const assetsDir = join(publicDL, 'assets');
if (existsSync(publicDL) && readdirSync(publicDL).includes('assets')) {
  rmSync(assetsDir, { recursive: true, force: true });
}

// Copy all files from DL dist to public/tools/decision-lens (skip index.html to avoid conflicting with Astro page)
function copyDir(src, dest) {
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src)) {
    if (entry === 'index.html') continue; // Astro page handles routing + auth
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

// Update index.astro with new hashed filenames
const astroPage = join(root, 'src/pages/tools/decision-lens/index.astro');
if (existsSync(astroPage)) {
  const newAssets = readdirSync(assetsDir);
  const jsFile = newAssets.find(f => f.endsWith('.js'));
  const cssFile = newAssets.find(f => f.endsWith('.css'));
  let content = readFileSync(astroPage, 'utf-8');
  if (jsFile) content = content.replace(/\/tools\/decision-lens\/assets\/index-[^"']+\.js/, `/tools/decision-lens/assets/${jsFile}`);
  if (cssFile) content = content.replace(/\/tools\/decision-lens\/assets\/index-[^"']+\.css/, `/tools/decision-lens/assets/${cssFile}`);
  writeFileSync(astroPage, content);
  console.log(`Updated index.astro → JS: ${jsFile}, CSS: ${cssFile}`);
}
