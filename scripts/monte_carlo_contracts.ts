import { readFileSync, writeFileSync } from 'node:fs';
import { z } from 'zod';
import * as runtime from '../src/lib/server/monte-carlo/contracts.ts';
import { loadMonteCarloConfig } from '../src/lib/server/monte-carlo/config.ts';
const check = process.argv.includes('--check');
const entries = Object.entries(runtime).filter(([name, value]) => name.endsWith('Schema') && value instanceof z.ZodType)
  .sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
function artifact(path: string, contents: string) {
  if (check) { if (readFileSync(path, 'utf8').replaceAll('\r\n', '\n') !== contents) throw new Error(`MC contract drift: ${path}`); }
  else writeFileSync(path, contents);
}
artifact('contracts/monte-carlo.ts', '/** Generated separate MC candidate types. */\nimport type { z } from \'zod\';\nimport type * as Runtime from \'../src/lib/server/monte-carlo/contracts.ts\';\n\n' + entries.map(([name]) => `export type ${name.slice(0,-6)} = z.infer<typeof Runtime.${name}>;`).join('\n') + '\n');
for (const [name, schema] of entries) artifact(`contracts/${name.slice(0,-6)}.schema.json`, JSON.stringify(z.toJSONSchema(schema as z.ZodType, {target:'draft-2020-12'}), null, 2) + '\n');
loadMonteCarloConfig();
console.log('Separate MC candidate contracts and actual proposed manifest validate; not Gate C acceptance.');
