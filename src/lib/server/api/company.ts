import fixture from '../../../../data/synthetic_hvac_company.json' with { type: 'json' };
import { CompanyInputSchema } from '../schemas.ts';

/** Bundle the synthetic fixture with the server; never rely on deployment cwd or mutate it. */
export function loadDemoCompany() {
  return CompanyInputSchema.parse(fixture);
}
