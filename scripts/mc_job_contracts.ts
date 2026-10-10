import { readFileSync, writeFileSync } from 'node:fs';
import { z } from 'zod';
import { MCJobStatusSchema, MCJobReceiptSchema } from '../src/lib/server/monte-carlo/jobs-contracts.ts';
for (const [name, schema] of Object.entries({ MCJobStatus: MCJobStatusSchema, MCJobReceipt: MCJobReceiptSchema })) {
  const path = `contracts/${name}.schema.json`;
  const body = JSON.stringify(z.toJSONSchema(schema, { target: 'draft-2020-12' }), null, 2) + '\n';
  if (process.argv.includes('--check')) {
    if (readFileSync(path, 'utf8').replaceAll('\r\n', '\n') !== body) throw new Error(`Job contract drift: ${path}`);
  } else writeFileSync(path, body);
}
