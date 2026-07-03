// Verify the BUILT site actually registers <bg-wc> on every demo page.
// Guards against tree-shaking regressions (gl-wc: sideEffects only listed
// dist/ paths, so Rollup dropped src/bg-wc.js's registration side effect from
// pages that import it transitively). Run after `npm run build:site`.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'dist-site';
if (!existsSync(join(ROOT, 'demos'))) {
  console.error('dist-site/demos missing — run `npm run build:site` first');
  process.exit(1);
}

// chunk name -> source, plus which chunks contain the element definition
const assets = new Map();
for (const f of readdirSync(join(ROOT, 'assets'))) {
  if (f.endsWith('.js')) assets.set(f, readFileSync(join(ROOT, 'assets', f), 'utf8'));
}
const defines = new Set(
  [...assets].filter(([, src]) => src.includes('customElements.define("bg-wc"') || src.includes("customElements.define('bg-wc'")).map(([f]) => f)
);

const chunkImports = (src) =>
  [...src.matchAll(/(?:import|from)\s*["']\.\/([\w.-]+\.js)["']|import\(["']\.\/([\w.-]+\.js)["']\)/g)]
    .map((m) => m[1] || m[2]);

function reachesDefine(entry) {
  const seen = new Set();
  const stack = [entry];
  while (stack.length) {
    const f = stack.pop();
    if (seen.has(f) || !assets.has(f)) continue;
    seen.add(f);
    if (defines.has(f)) return true;
    stack.push(...chunkImports(assets.get(f)));
  }
  return false;
}

let fail = 0;
for (const page of readdirSync(join(ROOT, 'demos'))) {
  if (!page.endsWith('.html') || page === 'index.html') continue;
  const html = readFileSync(join(ROOT, 'demos', page), 'utf8');
  const needsElement = html.includes('data-background') || html.includes('<bg-wc');
  if (!needsElement) continue;
  const refs = [
    ...[...html.matchAll(/<script[^>]*src="[^"]*assets\/([\w.-]+\.js)"/g)].map((m) => m[1]),
    ...[...html.matchAll(/<link[^>]*rel="modulepreload"[^>]*href="[^"]*assets\/([\w.-]+\.js)"/g)].map((m) => m[1]),
  ];
  const ok = refs.some(reachesDefine);
  if (!ok) {
    console.error(`FAIL ${page}: no script path reaches the bg-wc definition (refs: ${refs.join(', ') || 'none'})`);
    fail = 1;
  }
}
console.log(fail ? 'built-site verification FAILED' : `built-site verification OK (${defines.size} defining chunk(s))`);
process.exit(fail);
