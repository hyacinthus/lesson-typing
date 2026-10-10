/**
 * Writes the lucide icons the desktop app uses as SVG files
 * (desktop/app/icons/), from the lucide-react package the web app uses, so
 * that both show the same icons. Lucide is ISC licensed. The icons are
 * those desktop/app/icons.go names in calls of icon("..."). The web app's
 * own icon goes there too, as app.png, for the windows that show it.
 *
 * Run through `go generate ./app` in desktop/ after adding an icon.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const iconsDir = path.join(root, 'node_modules', 'lucide-react', 'dist', 'esm', 'icons');
const outDir = path.join(root, 'desktop', 'app', 'icons');

const source = fs.readFileSync(path.join(root, 'desktop', 'app', 'icons.go'), 'utf8');
const ICONS = [...source.matchAll(/\bicon\("([a-z0-9-]+)"\)/g)].map((m) => m[1]);

const escape = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });
for (const name of ICONS) {
  const { __iconNode } = await import(path.join(iconsDir, `${name}.mjs`));
  const children = __iconNode
    .map(([tag, attrs]) => {
      const list = Object.entries(attrs)
        .filter(([k]) => k !== 'key')
        .map(([k, v]) => `${k}="${escape(v)}"`)
        .join(' ');
      return `  <${tag} ${list}/>`;
    })
    .join('\n');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">\n${children}\n</svg>\n`;
  fs.writeFileSync(path.join(outDir, `${name}.svg`), svg);
}
// 192 pixels: the update window shows it at 64 points, up to 3x.
fs.copyFileSync(path.join(root, 'public', 'icons', 'icon-192.png'), path.join(outDir, 'app.png'));
console.log(`Wrote ${ICONS.length} icons and the app's to ${path.relative(process.cwd(), outDir)}`);
