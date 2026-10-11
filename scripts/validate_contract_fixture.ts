import { readFileSync } from 'node:fs';
import { CompanyInputSchema } from '../src/lib/server/schemas.ts';
const fixture = JSON.parse(readFileSync(new URL('../data/synthetic_hvac_company.json', import.meta.url), 'utf8'));
const parsed = CompanyInputSchema.safeParse(fixture);
if (!parsed.success) {
  console.error(JSON.stringify(parsed.error.issues.map(issue => ({ path: issue.path.join('.'), message: issue.message })), null, 2));
  process.exitCode = 1;
} else console.log('PASS: company fixture validates against authoritative Zod contract (not engine/Gate A/B acceptance).');
