// Post-build step: inject the build hash + hashed asset manifest into dist/sw.js
// so the service worker precaches exactly what this deploy ships and versions
// its caches per build (stale caches are dropped on activate).
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const distDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const swPath = path.join(distDir, 'sw.js');

const sw = readFileSync(swPath, 'utf8');

const assets = readdirSync(path.join(distDir, 'assets'))
  .filter((f) => /\.(?:js|css)$/.test(f))
  .map((f) => `/assets/${f}`)
  .sort();

const precache = ['/', '/index.html', '/manifest.json', ...assets];

const buildHash = createHash('sha1')
  .update(assets.join('|'))
  .digest('hex')
  .slice(0, 8);

const injected = sw
  .replaceAll('__BUILD_HASH__', buildHash)
  .replaceAll('__PRECACHE_ASSETS__', JSON.stringify(precache));

if (injected.includes('__BUILD_HASH__') || injected.includes('__PRECACHE_ASSETS__')) {
  throw new Error('build-sw: placeholder tokens not found in dist/sw.js');
}

writeFileSync(swPath, injected);

console.log(`[build-sw] cache hash: ${buildHash}, precaching ${precache.length} entries (${assets.length} hashed assets)`);
