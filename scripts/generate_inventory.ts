// scripts/generate_inventory.ts
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Resolve __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const INDEX_PATH = join(__dirname, '..', 'src', 'pages', 'Index.tsx');
const OUTPUT_PATH = join(__dirname, '..', 'feature_inventory.json');

function extractTabs(source: string): Record<string, { title: string; description: string; path: string; noindex?: boolean }> {
  const tabMetaMatch = source.match(/const TAB_SEO_META: Record<string, {[^}]*}> = {(.*?)};/s);
  if (!tabMetaMatch) return {};
  const objText = tabMetaMatch[1];
  const lines = objText.split(/\n/).map(l => l.trim());
  const tabs: any = {};
  let currentKey = '';
  for (const line of lines) {
    const keyMatch = line.match(/^([a-zA-Z_-]+): \{$/);
    if (keyMatch) {
      currentKey = keyMatch[1];
      tabs[currentKey] = {};
      continue;
    }
    if (currentKey) {
      const propMatch = line.match(/^([a-zA-Z]+): (.+),?$/);
      if (propMatch) {
        const [, prop, value] = propMatch;
        const clean = value.replace(/^['"]|['"]$/g, '');
        tabs[currentKey][prop] = clean;
      }
      if (line === '},') {
        currentKey = '';
      }
    }
  }
  return tabs;
}

function main() {
  const src = readFileSync(INDEX_PATH, 'utf-8');
  const tabs = extractTabs(src);
  const inventory = { generatedAt: new Date().toISOString(), tabs };
  writeFileSync(OUTPUT_PATH, JSON.stringify(inventory, null, 2), 'utf-8');
  console.log('Feature inventory written to', OUTPUT_PATH);
}

main();
