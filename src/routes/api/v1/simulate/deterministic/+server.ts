import { loadExampleCompany } from '../../../../../lib/server/api/company.ts';
import { apiResponse, readApiInput } from '../../../../../lib/server/api/http.ts';
import { simulate_deterministic } from '../../../../../lib/server/engine/scenarios.ts';
import { DeterministicRequestSchema, SimulationResultSchema } from '../../../../../lib/server/schemas.ts';

/** Real deterministic engine adapter; shared Gate A/B acceptance remains separately recorded. */
export async function POST({ request }: { request: Request }) {
  return apiResponse(async () => {
    const input = await readApiInput(request, DeterministicRequestSchema.refine(
      value => ['synthetic-hvac-001', 'synthetic-growth-hvac-002'].includes(value.company_id),
      { path: ['company_id'], message: 'Unknown company ID; choose an example company before simulating.' },
    ));
    const company = loadExampleCompany(input.company_id);
    return SimulationResultSchema.parse(simulate_deterministic(company, input));
  });
}
