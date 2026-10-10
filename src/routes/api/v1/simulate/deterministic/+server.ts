import { loadDemoCompany } from '../../../../../lib/server/api/company.ts';
import { apiResponse, readApiInput } from '../../../../../lib/server/api/http.ts';
import { simulate_deterministic } from '../../../../../lib/server/engine/scenarios.ts';
import { DeterministicRequestSchema, SimulationResultSchema } from '../../../../../lib/server/schemas.ts';

/** Real deterministic engine adapter; shared Gate A/B acceptance remains separately recorded. */
export async function POST({ request }: { request: Request }) {
  return apiResponse(async () => {
    const company = loadDemoCompany();
    const input = await readApiInput(request, DeterministicRequestSchema.refine(
      value => value.company_id === company.id,
      { path: ['company_id'], message: 'Unknown company ID; load the demo company before simulating.' },
    ));
    return SimulationResultSchema.parse(simulate_deterministic(company, input));
  });
}
