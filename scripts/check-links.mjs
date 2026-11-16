// Dead-link check for the built site. Run `npm run build` first.
//
// Two places links come from:
//   1. <a href="/..."> written directly in the built .html files
//   2. page paths in src/routes.ts, which the TypeScript code links to
// Every internal (starting with "/") link must match a file in dist/.
// External links (https://...) are only listed, not fetched: this check
// runs offline.

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';
if (!existsSync(DIST)) {
  console.error('dist/ not found. Run `npm run build` first.');
  process.exit(1);
}

function htmlFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return htmlFiles(path);
    return name.endsWith('.html') ? [path] : [];
  });
}

/** Map a URL path to the file a static host (CloudFront/S3, vite preview) would serve. */
function targetFile(urlPath) {
  const clean = urlPath.split(/[?#]/)[0];
  return join(DIST, clean.endsWith('/') ? clean + 'index.html' : clean);
}

const links = []; // { from, href }
for (const file of htmlFiles(DIST)) {
  const html = readFileSync(file, 'utf8');
  for (const m of html.matchAll(/(?:href|src)="([^"]+)"/g)) links.push({ from: file, href: m[1] });
}
const routes = readFileSync('src/routes.ts', 'utf8');
for (const m of routes.matchAll(/:\s*'(\/[^']*)'/g)) links.push({ from: 'src/routes.ts', href: m[1] });

let broken = 0;
const external = new Set();
for (const { from, href } of links) {
  if (/^https?:\/\//.test(href)) {
    external.add(href);
  } else if (href.startsWith('/')) {
    if (!existsSync(targetFile(href))) {
      console.error(`BROKEN  ${from} → ${href}`);
      broken++;
    }
  } else {
    console.error(`RELATIVE ${from} → ${href} (use absolute /paths so links work from any page)`);
    broken++;
  }
}

console.log(`Checked ${links.length} internal/asset links; ${broken} broken.`);
if (external.size) console.log(`External links (not checked): ${[...external].join(', ')}`);
process.exit(broken ? 1 : 0);
